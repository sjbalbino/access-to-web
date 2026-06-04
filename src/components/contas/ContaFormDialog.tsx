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
import { useSafras } from '@/hooks/useSafras';
import { AtribuicaoSocioSection, RateioModo, RateioManualItem } from './AtribuicaoSocioSection';
import { useSalvarRateioManual } from '@/hooks/useRateioSocios';

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
    observacoes: '',
    rateio_modo: 'rateio_granja' as RateioModo,
    socio_produtor_id: null as string | null,
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
      });
    } else {
      setForm((f: any) => ({ ...f, granja_id: granjas?.[0]?.id || '' }));
    }
  }, [initial, open, granjas]);

  const update = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const lockedByOrigem = !!(initial && (initial.contrato_venda_id || initial.entrada_nfe_id || initial.compra_cereais_id));

  const handleSubmit = async () => {
    const payload = {
      ...form,
      valor_original: parseFloat(form.valor_original) || 0,
    };
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
    const saved: any = await onSubmit(payload);
    // se modo manual, gravar rateio explícito (trigger respeitará)
    if (payload.rateio_modo === 'manual' && saved?.id) {
      await salvarManual.mutateAsync({
        origem_tipo: tipo === 'receber' ? 'cr' : 'cp',
        origem_id: saved.id,
        itens: rateioManual.map((i) => ({
          socio_produtor_id: i.socio_produtor_id,
          percentual: i.percentual,
          valor: +((payload.valor_original * i.percentual) / 100).toFixed(2),
        })),
      });
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
            <Label>Sub-centro de custo</Label>
            <Select isSearchable value={form.sub_centro_custo_id || undefined} onValueChange={(v) => update('sub_centro_custo_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {subCentros?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.codigo} - {s.descricao}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
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
