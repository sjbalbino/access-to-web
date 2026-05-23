import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Plus, Trash2, FileText, Link2, Unlink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useContasReceber, useDeleteContaReceber, useGerarParcelasReceber } from '@/hooks/useContasReceber';
import { GerarParcelasDialog } from './GerarParcelasDialog';
import { BaixasDialog } from './BaixasDialog';
import { VincularContraNotaDialog } from './VincularContraNotaDialog';
import { useContraNotaPorContrato, useDesvincularContraNota } from '@/hooks/useContraNotaVenda';

const formatBR = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_BADGE: Record<string, string> = {
  aberto: 'bg-sky-100 text-sky-700',
  parcial: 'bg-amber-100 text-amber-700',
  pago: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-muted text-muted-foreground',
};

interface Props {
  contrato: any;
}

export function ContasReceberContratoSection({ contrato }: Props) {
  const { canEdit } = useAuth();
  const { data: contas } = useContasReceber({ contratoVendaId: contrato.id });
  const gerar = useGerarParcelasReceber();
  const del = useDeleteContaReceber();

  const [openGerar, setOpenGerar] = useState(false);
  const [openBaixas, setOpenBaixas] = useState(false);
  const [openVincular, setOpenVincular] = useState(false);
  const [contaSel, setContaSel] = useState<any>(null);

  const { data: contraNota } = useContraNotaPorContrato(contrato.id);
  const desvincular = useDesvincularContraNota();

  const valorTotal = Number(contrato.valor_total) || 0;
  const temBaixa = (contas || []).some((c: any) => Number(c.valor_pago) > 0);

  const handleGerar = async (config: any) => {
    await gerar.mutateAsync({
      contrato_venda_id: contrato.id,
      granja_id: contrato.granja_id,
      cliente_id: contrato.comprador_id,
      safra_id: contrato.safra_id,
      documento: contrato.numero || null,
      valor_total: valorTotal,
      ...config,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-600" /> Contas a Receber
        </CardTitle>
        {canEdit && (
          <Button size="sm" onClick={() => setOpenGerar(true)} disabled={temBaixa || valorTotal <= 0}>
            <Plus className="h-4 w-4 mr-1" /> {contas?.length ? 'Regerar parcelas' : 'Gerar parcelas'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bloco Contra-Nota do Comprador */}
        <div className="border rounded-lg p-3 bg-muted/30">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-amber-600" />
              Contra-Nota do Comprador (Receita IR)
            </div>
            {canEdit && !contraNota && (
              <Button size="sm" variant="outline" onClick={() => setOpenVincular(true)}>
                <Link2 className="h-4 w-4 mr-1" /> Vincular contra-nota
              </Button>
            )}
          </div>
          {contraNota ? (
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="space-y-0.5">
                <div className="font-medium">
                  NF-e {contraNota.numero_nfe || '-'}{contraNota.serie ? `/${contraNota.serie}` : ''} — {contraNota.fornecedor?.nome}
                </div>
                <div className="text-xs text-muted-foreground">
                  Emissão: {contraNota.data_emissao ? format(parseISO(contraNota.data_emissao), 'dd/MM/yyyy') : '-'} •
                  Valor: <span className="font-semibold text-amber-700">{formatBR(Number(contraNota.valor_total))}</span>
                </div>
              </div>
              {canEdit && (
                <Button size="sm" variant="ghost" onClick={() => { if (confirm('Desvincular contra-nota?')) desvincular.mutate(contraNota.id); }}>
                  <Unlink className="h-4 w-4 mr-1" /> Desvincular
                </Button>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhuma contra-nota vinculada. A receita IR usa o valor do contrato ({formatBR(valorTotal)}).
            </p>
          )}
        </div>

        {(!contas || contas.length === 0) ? (
          <p className="text-sm text-muted-foreground">Nenhuma conta gerada para este contrato.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parcela</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Receita IR</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.map((c: any) => {
                const saldo = Number(c.valor_original) - Number(c.valor_pago);
                const receitaIr = Number(c.valor_receita_ir ?? c.valor_original);
                const diferente = Math.abs(receitaIr - Number(c.valor_original)) > 0.005;
                return (
                  <TableRow key={c.id}>
                    <TableCell>{c.parcela || '-'}</TableCell>
                    <TableCell>{format(parseISO(c.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right">{formatBR(Number(c.valor_original))}</TableCell>
                    <TableCell className={`text-right ${diferente ? 'text-amber-700 font-semibold' : 'text-muted-foreground'}`}>
                      {formatBR(receitaIr)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600">{formatBR(Number(c.valor_pago))}</TableCell>
                    <TableCell className="text-right font-semibold">{formatBR(Math.max(0, saldo))}</TableCell>
                    <TableCell><Badge className={STATUS_BADGE[c.status]}>{c.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setContaSel(c); setOpenBaixas(true); }}>
                          <DollarSign className="h-4 w-4 text-emerald-600" />
                        </Button>
                        {canEdit && Number(c.valor_pago) === 0 && (
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm('Excluir parcela?')) del.mutate(c.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
        tipo="receber"
        valorTotal={valorTotal}
        onGerar={handleGerar}
      />
      <BaixasDialog
        open={openBaixas}
        onOpenChange={(v) => { setOpenBaixas(v); if (!v) setContaSel(null); }}
        tipo="receber"
        conta={contaSel}
      />
      <VincularContraNotaDialog
        open={openVincular}
        onOpenChange={setOpenVincular}
        contratoId={contrato.id}
        granjaId={contrato.granja_id}
        fornecedorId={contrato.comprador_id}
      />
    </Card>
  );
}
