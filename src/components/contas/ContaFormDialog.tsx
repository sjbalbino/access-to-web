import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGranjas } from '@/hooks/useGranjas';
import { useClientesFornecedores } from '@/hooks/useClientesFornecedores';
import { useDreContas } from '@/hooks/useDreContas';
import { useAllSubCentrosCusto } from '@/hooks/useSubCentrosCusto';
import { useProdutos } from '@/hooks/useProdutos';
import { useSafras } from '@/hooks/useSafras';
import { AtribuicaoSocioSection, RateioModo, RateioManualItem } from './AtribuicaoSocioSection';
import { useSalvarRateioManual } from '@/hooks/useRateioSocios';
import { useContasBancarias } from '@/hooks/useContasBancarias';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: 'receber' | 'pagar';
  initial?: any;
  onSubmit: (data: any) => void | Promise<void>;
}

export function ContaFormDialog({ open, onOpenChange, tipo, initial, onSubmit }: Props) {
  const { data: granjas } = useGranjas();
  const { data: clientes } = useClientesFornecedores();
  const { data: dreContas } = useDreContas();
  const { data: subCentros } = useAllSubCentrosCusto();
  const { data: safras } = useSafras();
  const { data: contasBancarias } = useContasBancarias({ ativo: true });
  const { data: produtos } = useProdutos();

  const [form, setForm] = useState<any>({
    granja_id: '',
    [tipo === 'receber' ? 'cliente_id' : 'fornecedor_id']: undefined,
    documento: '',
    parcela: '',
    data_emissao: new Date().toISOString().slice(0, 10),
    data_vencimento: new Date().toISOString().slice(0, 10),
    valor_original: '',
    dre_conta_id: undefined,
    sub_centro_custo_id: undefined,
    safra_id: undefined,
    produto_id: undefined,
    observacoes: '',
    rateio_modo: 'rateio_granja' as RateioModo,
    socio_produtor_id: null as string | null,
    ja_pago: false,
    // Novos campos para pagamento imediato
    num_parcelas: 1,
    intervalo_dias: 30,
    juros: '0',
    multa: '0',
    desconto: '0',
    forma_pagamento: 'pix',
    conta_bancaria_id: '',
  });
  const [rateioManual, setRateioManual] = useState<RateioManualItem[]>([]);
  const salvarManual = useSalvarRateioManual();

  useEffect(() => {
    if (initial) {
      setForm({
        ...initial,
        valor_original: String(initial.valor_original ?? ''),
        rateio_modo: initial.rateio_modo || 'rateio_granja',
        socio_produtor_id: initial.socio_produtor_id || null,
        ja_pago: initial.status === 'pago',
      });
    } else {
      const principal = granjas?.find(g => g.is_principal) || granjas?.[0];
      setForm((f: any) => ({ ...f, granja_id: principal?.id || '' }));
    }
  }, [initial, open, granjas]);

  const update = (k: string, v: any) => {
    setForm((f: any) => {
      const newForm = { ...f, [k]: v };
      
      // Lógica de vínculo automático
      if (k === 'produto_id' && v) {
        const produto = produtos?.find((p: any) => p.id === v);
        if (produto) {
          if (produto.conta_gerencial_id) {
            newForm.sub_centro_custo_id = produto.conta_gerencial_id;
            const sub = subCentros?.find((s: any) => s.id === produto.conta_gerencial_id);
            if (sub?.codigo_dre) {
              const dre = dreContas?.find((d: any) => d.codigo === sub.codigo_dre);
              if (dre) newForm.dre_conta_id = dre.id;
            }
          }
        }
      } else if (k === 'sub_centro_custo_id' && v) {
        const sub = subCentros?.find((s: any) => s.id === v);
        if (sub?.codigo_dre) {
          const dre = dreContas?.find((d: any) => d.codigo === sub.codigo_dre);
          if (dre) newForm.dre_conta_id = dre.id;
        }
      }
      
      return newForm;
    });
  };

  const lockedByOrigem = !!(initial && (initial.contrato_venda_id || initial.entrada_nfe_id || initial.compra_cereais_id));

  const handleSubmit = async () => {
    const valorOriginal = parseFloat(form.valor_original) || 0;
    const numParcelas = parseInt(form.num_parcelas) || 1;

    if (numParcelas > 1) {
      // Usar a lógica de geração de parcelas
      const config = {
        granja_id: form.granja_id,
        [tipo === 'receber' ? 'cliente_id' : 'fornecedor_id']: form[tipo === 'receber' ? 'cliente_id' : 'fornecedor_id'],
        valor_total: valorOriginal,
        num_parcelas: numParcelas,
        primeiro_vencimento: form.data_vencimento,
        intervalo_dias: parseInt(form.intervalo_dias) || 30,
        ja_pago: form.ja_pago,
        data_emissao: form.data_emissao,
        dre_conta_id: form.dre_conta_id,
        sub_centro_custo_id: form.sub_centro_custo_id,
        safra_id: form.safra_id,
        documento: form.documento,
      };

      // Nota: Idealmente chamaríamos o hook de gerar parcelas aqui, 
      // mas como o onSubmit vem de fora, vamos adaptar.
      // No caso de múltiplas parcelas, o onSubmit precisará lidar com isso 
      // ou faremos chamadas separadas. 
      // Para manter a simplicidade e consistência com o que o usuário pediu:
      // "ao incluir uma conta... tenha a opção de parcelar"
      
      // Se num_parcelas > 1, vamos delegar para uma função de lote se disponível, 
      // ou o pai precisará saber lidar. Atualmente os hooks useCreate suportam apenas 1.
      // Vou ajustar para que o onSubmit aceite o objeto de configuração de parcelas se num_parcelas > 1.
      await onSubmit({ ...config, _isBatch: true });
    } else {
      const payload = {
        ...form,
        valor_original: valorOriginal,
        valor_pago: form.ja_pago ? valorOriginal : 0,
        status: form.ja_pago ? 'pago' : 'aberto',
      };
      
      const { ja_pago, num_parcelas, intervalo_dias, juros, multa, desconto, forma_pagamento, conta_bancaria_id, ...restPayload } = payload;
      Object.keys(restPayload).forEach(k => { if (restPayload[k] === '') restPayload[k] = null; });
      
      const saved: any = await onSubmit(restPayload);

      // Se já pago, criar a baixa vinculada
      if (form.ja_pago && saved?.id) {
        const cbSelecionada = contasBancarias.find((c: any) => c.id === form.conta_bancaria_id);
        const baixaPayload = {
          conta_id: saved.id,
          data_pagamento: form.data_emissao, // ou data_vencimento? Normalmente data_emissao se pago na inclusão
          valor_pago: valorOriginal,
          juros: parseFloat(form.juros) || 0,
          multa: parseFloat(form.multa) || 0,
          desconto: parseFloat(form.desconto) || 0,
          forma_pagamento: form.forma_pagamento,
          conta_bancaria_id: form.conta_bancaria_id || null,
          conta_bancaria: cbSelecionada ? cbSelecionada.nome : null,
          documento: form.documento || null,
        };
        
        const table = tipo === 'receber' ? 'contas_receber_baixas' : 'contas_pagar_baixas';
        await supabase.from(table as any).insert(baixaPayload);
      }

      if (payload.rateio_modo === 'manual' && saved?.id) {
        await salvarManual.mutateAsync({
          origem_tipo: tipo === 'receber' ? 'cr' : 'cp',
          origem_id: saved.id,
          itens: rateioManual.map((i) => ({
            socio_produtor_id: i.socio_produtor_id,
            percentual: i.percentual,
            valor: +((valorOriginal * i.percentual) / 100).toFixed(2),
          })),
        });
      }
    }
    onOpenChange(false);
  };


  const partyField = tipo === 'receber' ? 'cliente_id' : 'fornecedor_id';
  const partyLabel = tipo === 'receber' ? 'Cliente' : 'Fornecedor';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? 'Editar' : 'Nova'} {tipo === 'receber' ? 'Conta a Receber' : 'Conta a Pagar'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Granja *</Label>
            <Select isSearchable value={form.granja_id || undefined} onValueChange={(v) => update('granja_id', v)} disabled={lockedByOrigem}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {granjas?.map(g => <SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{partyLabel}</Label>
            <Select isSearchable value={form[partyField] || undefined} onValueChange={(v) => update(partyField, v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {clientes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}{c.nome_fantasia ? ` (${c.nome_fantasia})` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Documento</Label>
            <Input value={form.documento || ''} onChange={(e) => update('documento', e.target.value)} />
          </div>
          <div>
            <Label>Parcela</Label>
            <Input value={form.parcela || ''} onChange={(e) => update('parcela', e.target.value)} placeholder="1/3" />
          </div>
          <div>
            <Label>Data emissão</Label>
            <Input type="date" value={form.data_emissao} onChange={(e) => update('data_emissao', e.target.value)} />
          </div>
          <div>
            <Label>Vencimento *</Label>
            <Input type="date" value={form.data_vencimento} onChange={(e) => update('data_vencimento', e.target.value)} />
          </div>
          <div>
            <Label>Valor original *</Label>
            <Input type="number" step="0.01" value={form.valor_original} onChange={(e) => update('valor_original', e.target.value)} disabled={lockedByOrigem} />
          </div>
          <div>
            <Label>Safra</Label>
            <Select isSearchable value={form.safra_id || undefined} onValueChange={(v) => update('safra_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {safras?.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Conta DRE</Label>
            <Select isSearchable value={form.dre_conta_id || undefined} onValueChange={(v) => update('dre_conta_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {dreContas?.map(d => <SelectItem key={d.id} value={d.id}>{d.codigo} - {d.descricao}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Produto</Label>
            <Select isSearchable value={form.produto_id || undefined} onValueChange={(v) => update('produto_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {produtos?.filter(p => p.ativo).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sub-centro de custo</Label>
            <Select isSearchable value={form.sub_centro_custo_id || undefined} onValueChange={(v) => update('sub_centro_custo_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {subCentros?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.codigo} - {s.descricao}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!initial?.id && (
            <>
              <div className="col-span-1">
                <Label>Parcelar em (vezes)</Label>
                <Input 
                  type="number" 
                  min={1} 
                  max={60} 
                  value={form.num_parcelas} 
                  onChange={(e) => update('num_parcelas', e.target.value)} 
                />
              </div>
              <div className="col-span-1">
                <Label>Intervalo entre parcelas (dias)</Label>
                <Input 
                  type="number" 
                  min={1} 
                  value={form.intervalo_dias} 
                  onChange={(e) => update('intervalo_dias', e.target.value)} 
                  disabled={parseInt(form.num_parcelas) <= 1}
                />
              </div>
            </>
          )}

          <div className={cn("col-span-2 flex items-center space-x-2 border rounded-md p-3 transition-colors", form.ja_pago ? "bg-emerald-50 border-emerald-200" : "bg-muted/30")}>
            <input
              type="checkbox"
              id="ja_pago"
              checked={form.ja_pago}
              onChange={(e) => update('ja_pago', e.target.checked)}
              className="h-4 w-4 rounded border-input"
              disabled={lockedByOrigem}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="ja_pago" className="text-sm font-medium leading-none">
                Já {tipo === 'receber' ? 'recebido' : 'pago'}?
              </Label>
              <p className="text-xs text-muted-foreground">
                Define o status como "pago" e registra a baixa imediatamente.
              </p>
            </div>
          </div>

          {form.ja_pago && (
            <div className="col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border rounded-md bg-emerald-50/50 border-emerald-100">
              <div className="col-span-2 md:col-span-4 font-semibold text-sm text-emerald-800 border-b border-emerald-100 pb-2 mb-1">
                Informações da Baixa
              </div>
              <div>
                <Label>Juros</Label>
                <Input type="number" step="0.01" value={form.juros} onChange={(e) => update('juros', e.target.value)} />
              </div>
              <div>
                <Label>Multa</Label>
                <Input type="number" step="0.01" value={form.multa} onChange={(e) => update('multa', e.target.value)} />
              </div>
              <div>
                <Label>Desconto</Label>
                <Input type="number" step="0.01" value={form.desconto} onChange={(e) => update('desconto', e.target.value)} />
              </div>
              <div>
                <Label>Forma de Pagto.</Label>
                <Select value={form.forma_pagamento} onValueChange={(v) => update('forma_pagamento', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['dinheiro', 'pix', 'boleto', 'transferencia', 'cheque', 'cartao', 'outro'].map(f => (
                      <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Conta Bancária (para conciliação)</Label>
                <Select value={form.conta_bancaria_id} onValueChange={(v) => update('conta_bancaria_id', v)}>
                  <SelectTrigger className="h-auto py-2">
                    <SelectValue placeholder="Selecione a conta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contasBancarias?.map((c: any) => {
                      const bancoInfo = c.banco ? `${c.banco.codigo} - ${c.banco.nome}` : '';
                      const agenciaConta = [
                        c.agencia ? `Ag. ${c.agencia}${c.agencia_dv ? '-' + c.agencia_dv : ''}` : '',
                        c.conta ? `C/C ${c.conta}${c.conta_dv ? '-' + c.conta_dv : ''}` : ''
                      ].filter(Boolean).join(' | ');
                      
                      return (
                        <SelectItem key={c.id} value={c.id} className="py-2">
                          <div className="flex flex-col items-start gap-0.5 text-left">
                            <span className="font-medium">{c.nome} {agenciaConta ? `(${agenciaConta})` : ''}</span>
                            <span className="text-[10px] text-muted-foreground uppercase leading-none">
                              {[
                                bancoInfo,
                                c.socio?.nome ? `Sócio: ${c.socio.nome}` : '',
                                c.titular ? `Titular: ${c.titular}` : ''
                              ].filter(Boolean).join(' | ')}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea value={form.observacoes || ''} onChange={(e) => update('observacoes', e.target.value)} rows={2} />
          </div>
          <div className="col-span-2">
            <AtribuicaoSocioSection
              granjaId={form.granja_id}
              valorTotal={parseFloat(form.valor_original) || 0}
              modo={form.rateio_modo}
              socioUnicoId={form.socio_produtor_id}
              rateioManual={rateioManual}
              onChange={(v) => {
                update('rateio_modo', v.modo);
                update('socio_produtor_id', v.socio_produtor_id);
                setRateioManual(v.manual);
              }}
            />
          </div>
        </div>


        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!form.granja_id || !form.data_vencimento || !form.valor_original}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
