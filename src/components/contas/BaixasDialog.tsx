import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, Printer } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { gerarReciboPDF } from '@/lib/reciboPdf';
import { useAuth } from '@/contexts/AuthContext';
import {
  useBaixasContaReceber,
  useCreateBaixaReceber,
  useDeleteBaixaReceber,
} from '@/hooks/useContasReceber';
import {
  useBaixasContaPagar,
  useCreateBaixaPagar,
  useDeleteBaixaPagar,
} from '@/hooks/useContasPagar';

const formatBR = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const FORMAS = ['dinheiro', 'pix', 'boleto', 'transferencia', 'cheque', 'cartao', 'outro'];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: 'receber' | 'pagar';
  conta: {
    id: string;
    documento: string | null;
    parcela: string | null;
    valor_original: number;
    valor_pago: number;
    data_vencimento: string;
  } | null;
}

export function BaixasDialog({ open, onOpenChange, tipo, conta }: Props) {
  const { canEdit } = useAuth();
  const baixasRec = useBaixasContaReceber(tipo === 'receber' ? conta?.id ?? null : null);
  const baixasPag = useBaixasContaPagar(tipo === 'pagar' ? conta?.id ?? null : null);
  const createRec = useCreateBaixaReceber();
  const createPag = useCreateBaixaPagar();
  const deleteRec = useDeleteBaixaReceber();
  const deletePag = useDeleteBaixaPagar();

  const baixas = (tipo === 'receber' ? baixasRec.data : baixasPag.data) || [];
  const totalPago = baixas.reduce((s, b) => s + Number(b.valor_pago) + Number(b.juros) + Number(b.multa) - Number(b.desconto), 0);
  const saldo = conta ? Number(conta.valor_original) - totalPago : 0;

  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().slice(0, 10));
  const [valorPago, setValorPago] = useState('');
  const [juros, setJuros] = useState('0');
  const [multa, setMulta] = useState('0');
  const [desconto, setDesconto] = useState('0');
  const [formaPagamento, setFormaPagamento] = useState<string | undefined>('pix');
  const [contaBancaria, setContaBancaria] = useState('');
  const [documento, setDocumento] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [proximoRecibo, setProximoRecibo] = useState<string>('');

  // Buscar próximo nº de recibo ao abrir
  useEffect(() => {
    if (!open || tipo !== 'receber' || !conta) return;
    (async () => {
      // Descobrir tenant pela própria conta
      const { data: cr } = await supabase
        .from('contas_receber' as any)
        .select('tenant_id')
        .eq('id', conta.id)
        .single();
      const tenantId = (cr as any)?.tenant_id;
      if (!tenantId) return;
      const { data } = await supabase.rpc('proximo_numero_recibo' as any, { _tenant: tenantId });
      if (data) setProximoRecibo(String(data));
    })();
  }, [open, tipo, conta, baixasRec.data]);

  const resetForm = () => {
    setValorPago('');
    setJuros('0');
    setMulta('0');
    setDesconto('0');
    setContaBancaria('');
    setDocumento('');
    setObservacoes('');
  };

  const buildReciboData = async (baixa: any, numero: string) => {
    if (!conta) return null;
    const c: any = conta;
    // Buscar dados do emitente (granja) e pagador (cliente) e contrato
    const [granjaRes, clienteRes, contratoRes] = await Promise.all([
      c.granja_id
        ? supabase.from('granjas' as any).select('razao_social, cnpj, endereco, cidade, uf').eq('id', c.granja_id).single()
        : Promise.resolve({ data: null }),
      c.cliente_id
        ? supabase.from('clientes_fornecedores' as any).select('nome, nome_fantasia, cpf_cnpj').eq('id', c.cliente_id).single()
        : Promise.resolve({ data: null }),
      c.contrato_venda_id
        ? supabase.from('contratos_venda' as any).select('numero').eq('id', c.contrato_venda_id).single()
        : Promise.resolve({ data: null }),
    ]);
    const granja: any = granjaRes.data || {};
    const cliente: any = clienteRes.data || {};
    const contrato: any = contratoRes.data || {};
    const total = Number(baixa.valor_pago) + Number(baixa.juros) + Number(baixa.multa) - Number(baixa.desconto);
    return {
      numero,
      data_pagamento: baixa.data_pagamento,
      valor_total: total,
      valor_pago: Number(baixa.valor_pago),
      juros: Number(baixa.juros),
      multa: Number(baixa.multa),
      desconto: Number(baixa.desconto),
      forma_pagamento: baixa.forma_pagamento,
      documento: baixa.documento || c.documento,
      parcela: c.parcela,
      observacoes: baixa.observacoes,
      emitente: {
        razao_social: granja.razao_social,
        cnpj: granja.cnpj,
        endereco: granja.endereco,
        cidade: granja.cidade,
        uf: granja.uf,
      },
      pagador: {
        nome: cliente.nome_fantasia ? `${cliente.nome} (${cliente.nome_fantasia})` : cliente.nome,
        cpf_cnpj: cliente.cpf_cnpj,
      },
      contrato_numero: contrato.numero,
    };
  };

  const handleSalvarBaixa = async () => {
    if (!conta) return;
    const v = parseFloat(valorPago);
    if (!v || v <= 0) return;
    const numeroRecibo = tipo === 'receber' ? (proximoRecibo || null) : null;
    const payload: any = {
      conta_id: conta.id,
      data_pagamento: dataPagamento,
      valor_pago: v,
      juros: parseFloat(juros) || 0,
      multa: parseFloat(multa) || 0,
      desconto: parseFloat(desconto) || 0,
      forma_pagamento: formaPagamento || null,
      conta_bancaria: contaBancaria || null,
      documento: documento || null,
      observacoes: observacoes || null,
      lancamento_financeiro_id: null,
    };
    if (tipo === 'receber') {
      payload.numero_recibo = numeroRecibo;
      await createRec.mutateAsync(payload);
      // Abrir PDF do recibo
      if (numeroRecibo) {
        const reciboData = await buildReciboData(payload, numeroRecibo);
        if (reciboData) gerarReciboPDF(reciboData);
      }
    } else {
      await createPag.mutateAsync(payload);
    }
    resetForm();
  };

  const handleReimprimir = async (b: any) => {
    if (!b.numero_recibo) return;
    const reciboData = await buildReciboData(b, b.numero_recibo);
    if (reciboData) gerarReciboPDF(reciboData);
  };

  const handleDelete = async (id: string) => {
    if (!conta) return;
    if (!confirm('Excluir esta baixa?')) return;
    if (tipo === 'receber') await deleteRec.mutateAsync({ id, conta_id: conta.id });
    else await deletePag.mutateAsync({ id, conta_id: conta.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Baixas — {tipo === 'receber' ? 'Conta a Receber' : 'Conta a Pagar'}
            {conta?.documento ? ` Doc. ${conta.documento}` : ''}
            {conta?.parcela ? ` (${conta.parcela})` : ''}
          </DialogTitle>
        </DialogHeader>

        {conta && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Valor original</div><div className="text-lg font-bold">{formatBR(Number(conta.valor_original))}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Total pago</div><div className="text-lg font-bold text-emerald-600">{formatBR(totalPago)}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Saldo restante</div><div className={`text-lg font-bold ${saldo > 0.01 ? 'text-amber-600' : 'text-muted-foreground'}`}>{formatBR(Math.max(0, saldo))}</div></CardContent></Card>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Baixas registradas</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Juros</TableHead>
                    <TableHead className="text-right">Multa</TableHead>
                    <TableHead className="text-right">Desc.</TableHead>
                    <TableHead>Doc.</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {baixas.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-4">Nenhuma baixa</TableCell></TableRow>
                  )}
                  {baixas.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell>{format(parseISO(b.data_pagamento), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{b.forma_pagamento || '-'}</TableCell>
                      <TableCell className="text-right">{formatBR(Number(b.valor_pago))}</TableCell>
                      <TableCell className="text-right">{formatBR(Number(b.juros))}</TableCell>
                      <TableCell className="text-right">{formatBR(Number(b.multa))}</TableCell>
                      <TableCell className="text-right">{formatBR(Number(b.desconto))}</TableCell>
                      <TableCell>{b.documento || '-'}</TableCell>
                      <TableCell>
                        {canEdit && (
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(b.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {canEdit && saldo > 0.01 && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="font-semibold text-sm">Nova baixa</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label>Data pagamento</Label>
                    <Input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
                  </div>
                  <div>
                    <Label>Valor *</Label>
                    <Input type="number" step="0.01" value={valorPago} placeholder={saldo.toFixed(2)} onChange={(e) => setValorPago(e.target.value)} />
                  </div>
                  <div>
                    <Label>Juros</Label>
                    <Input type="number" step="0.01" value={juros} onChange={(e) => setJuros(e.target.value)} />
                  </div>
                  <div>
                    <Label>Multa</Label>
                    <Input type="number" step="0.01" value={multa} onChange={(e) => setMulta(e.target.value)} />
                  </div>
                  <div>
                    <Label>Desconto</Label>
                    <Input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
                  </div>
                  <div>
                    <Label>Forma de pagamento</Label>
                    <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FORMAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Conta bancária</Label>
                    <Input value={contaBancaria} onChange={(e) => setContaBancaria(e.target.value)} />
                  </div>
                  <div>
                    <Label>Documento/Comprovante</Label>
                    <Input value={documento} onChange={(e) => setDocumento(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
                </div>
                <Button onClick={handleSalvarBaixa} disabled={!valorPago || parseFloat(valorPago) <= 0}>
                  <Plus className="h-4 w-4 mr-2" /> Registrar baixa
                </Button>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
