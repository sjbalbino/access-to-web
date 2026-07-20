import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useContasPagar, useDeleteContaPagar, useGerarParcelasPagar, useUpdateContaPagar } from '@/hooks/useContasPagar';
import { GerarParcelasDialog } from './GerarParcelasDialog';
import { BaixasDialog } from './BaixasDialog';

const formatBR = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_BADGE: Record<string, string> = {
  aberto: 'bg-sky-100 text-sky-700',
  parcial: 'bg-amber-100 text-amber-700',
  pago: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-muted text-muted-foreground',
};

interface Props {
  entrada: any;
}

export function ContasPagarEntradaSection({ entrada }: Props) {
  const { canEdit } = useAuth();
  const { data: contas } = useContasPagar({ entradaNfeId: entrada.id });
  const gerar = useGerarParcelasPagar();
  const del = useDeleteContaPagar();
  const update = useUpdateContaPagar();

  const [openGerar, setOpenGerar] = useState(false);
  const [openBaixas, setOpenBaixas] = useState(false);
  const [contaSel, setContaSel] = useState<any>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVenc, setEditVenc] = useState('');
  const [editValor, setEditValor] = useState<string>('');

  const valorTotal = Number(entrada.valor_total) || 0;
  const temBaixa = (contas || []).some((c: any) => Number(c.valor_pago) > 0);

  const handleGerar = async (config: any) => {
    await gerar.mutateAsync({
      entrada_nfe_id: entrada.id,
      granja_id: entrada.granja_id,
      fornecedor_id: entrada.fornecedor_id,
      documento: entrada.numero_nfe || null,
      valor_total: valorTotal,
      ...config,
    });
  };

  const startEdit = (c: any) => {
    setEditId(c.id);
    setEditVenc(c.data_vencimento);
    setEditValor(String(c.valor_original));
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditVenc('');
    setEditValor('');
  };

  const saveEdit = async () => {
    if (!editId) return;
    const valor = parseFloat(editValor.replace(',', '.'));
    if (!editVenc || !valor || valor <= 0) return;
    await update.mutateAsync({ id: editId, data_vencimento: editVenc, valor_original: valor });
    cancelEdit();
  };

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-rose-600" /> Contas a Pagar
        </CardTitle>
        {canEdit && (
          <Button size="sm" onClick={() => setOpenGerar(true)} disabled={temBaixa || valorTotal <= 0}>
            <Plus className="h-4 w-4 mr-1" /> {contas?.length ? 'Regerar parcelas' : 'Gerar parcelas'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {(!contas || contas.length === 0) ? (
          <p className="text-sm text-muted-foreground">Nenhuma conta gerada para esta entrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parcela</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.map((c: any) => {
                const saldo = Number(c.valor_original) - Number(c.valor_pago);
                const isEditing = editId === c.id;
                const podeEditar = canEdit && Number(c.valor_pago) === 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell>{c.parcela || '-'}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input type="date" value={editVenc} onChange={(e) => setEditVenc(e.target.value)} className="h-8 w-36" />
                      ) : (
                        format(parseISO(c.data_vencimento), 'dd/MM/yyyy')
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input type="number" step="0.01" min="0.01" value={editValor} onChange={(e) => setEditValor(e.target.value)} className="h-8 w-28 text-right ml-auto" />
                      ) : (
                        formatBR(Number(c.valor_original))
                      )}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600">{formatBR(Number(c.valor_pago))}</TableCell>
                    <TableCell className="text-right font-semibold">{formatBR(Math.max(0, saldo))}</TableCell>
                    <TableCell><Badge className={STATUS_BADGE[c.status]}>{c.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {isEditing ? (
                          <>
                            <Button size="icon" variant="ghost" onClick={saveEdit} disabled={update.isPending}>
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={cancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => { setContaSel(c); setOpenBaixas(true); }}>
                              <DollarSign className="h-4 w-4 text-emerald-600" />
                            </Button>
                            {podeEditar && (
                              <Button size="icon" variant="ghost" onClick={() => startEdit(c)}>
                                <Pencil className="h-4 w-4 text-sky-600" />
                              </Button>
                            )}
                            {podeEditar && (
                              <Button size="icon" variant="ghost" onClick={() => { if (confirm('Excluir parcela?')) del.mutate(c.id); }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <GerarParcelasDialog
        open={openGerar}
        onOpenChange={setOpenGerar}
        tipo="pagar"
        valorTotal={valorTotal}
        onGerar={handleGerar}
      />
      <BaixasDialog
        open={openBaixas}
        onOpenChange={(v) => { setOpenBaixas(v); if (!v) setContaSel(null); }}
        tipo="pagar"
        conta={contaSel}
      />
    </Card>
  );
}
