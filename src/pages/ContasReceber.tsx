import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useGranjas } from '@/hooks/useGranjas';
import { useClientesFornecedores } from '@/hooks/useClientesFornecedores';
import {
  useContasReceber,
  useCreateContaReceber,
  useUpdateContaReceber,
  useDeleteContaReceber,
} from '@/hooks/useContasReceber';
import { usePaginacao } from '@/hooks/usePaginacao';
import { TablePagination } from '@/components/ui/table-pagination';
import { ContaFormDialog } from '@/components/contas/ContaFormDialog';
import { BaixasDialog } from '@/components/contas/BaixasDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const formatBR = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_BADGE: Record<string, string> = {
  aberto: 'bg-sky-100 text-sky-700',
  parcial: 'bg-amber-100 text-amber-700',
  pago: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-muted text-muted-foreground',
};

export default function ContasReceber() {
  const { canEdit } = useAuth();
  const { data: granjas } = useGranjas();
  const { data: clientes } = useClientesFornecedores();

  const [filtroGranja, setFiltroGranja] = useState<string | undefined>();
  const [filtroStatus, setFiltroStatus] = useState<string | undefined>();
  const [filtroCliente, setFiltroCliente] = useState<string | undefined>();
  const [vencDe, setVencDe] = useState('');
  const [vencAte, setVencAte] = useState('');
  const [busca, setBusca] = useState('');

  const { data: contas, isLoading } = useContasReceber({
    granjaId: filtroGranja,
    status: filtroStatus,
    clienteId: filtroCliente,
    vencimentoDe: vencDe || undefined,
    vencimentoAte: vencAte || undefined,
    busca: busca || undefined,
  });

  const create = useCreateContaReceber();
  const update = useUpdateContaReceber();
  const del = useDeleteContaReceber();

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [openBaixas, setOpenBaixas] = useState(false);
  const [baixaConta, setBaixaConta] = useState<any>(null);

  const totais = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const em7 = new Date(); em7.setDate(em7.getDate() + 7);
    const em7Str = em7.toISOString().slice(0, 10);
    let aberto = 0, vencido = 0, aVencer = 0, pagoMes = 0;
    const mesIni = new Date(); mesIni.setDate(1);
    const mesIniStr = mesIni.toISOString().slice(0, 10);
    (contas || []).forEach((c: any) => {
      const saldo = Number(c.valor_original) - Number(c.valor_pago);
      if (c.status !== 'cancelado' && c.status !== 'pago') {
        aberto += saldo;
        if (c.data_vencimento < hoje) vencido += saldo;
        else if (c.data_vencimento <= em7Str) aVencer += saldo;
      }
      if (Number(c.valor_pago) > 0 && c.updated_at >= mesIniStr) pagoMes += Number(c.valor_pago);
    });
    return { aberto, vencido, aVencer, pagoMes };
  }, [contas]);

  const { dadosPaginados, paginaAtual, totalPaginas, setPaginaAtual, gerarNumerosPaginas } = usePaginacao(contas || [], 20);

  const handleSave = async (data: any) => {
    if (editing?.id) await update.mutateAsync({ id: editing.id, ...data });
    else await create.mutateAsync(data);
    setEditing(null);
  };

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <AppLayout>
      <PageHeader title="Contas a Receber" description="Títulos a receber e baixas de pagamento" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Em aberto</div><div className="text-lg font-bold text-sky-600">{formatBR(totais.aberto)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Vencido</div><div className="text-lg font-bold text-destructive">{formatBR(totais.vencido)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">A vencer (7 dias)</div><div className="text-lg font-bold text-amber-600">{formatBR(totais.aVencer)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Recebido no mês</div><div className="text-lg font-bold text-emerald-600">{formatBR(totais.pagoMes)}</div></CardContent></Card>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <Label>Granja</Label>
            <Select value={filtroGranja} onValueChange={(v) => setFiltroGranja(v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas</SelectItem>{granjas?.map(g => <SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cliente</Label>
            <Select value={filtroCliente} onValueChange={(v) => setFiltroCliente(v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem>{clientes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Venc. de</Label>
            <Input type="date" value={vencDe} onChange={(e) => setVencDe(e.target.value)} />
          </div>
          <div>
            <Label>Venc. até</Label>
            <Input type="date" value={vencAte} onChange={(e) => setVencAte(e.target.value)} />
          </div>
          <div>
            <Label>Documento</Label>
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end mb-3">
        {canEdit && (
          <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova conta
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? <Skeleton className="h-40" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Doc./Parc.</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosPaginados.map((c: any) => {
                  const saldo = Number(c.valor_original) - Number(c.valor_pago);
                  const vencido = c.status !== 'pago' && c.status !== 'cancelado' && c.data_vencimento < hoje;
                  return (
                    <TableRow key={c.id} className={cn(vencido && 'bg-destructive/5')}>
                      <TableCell className={vencido ? 'text-destructive font-semibold' : ''}>{format(parseISO(c.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{c.cliente?.nome || '-'}</TableCell>
                      <TableCell>{c.documento || '-'}{c.parcela ? ` (${c.parcela})` : ''}</TableCell>
                      <TableCell className="text-xs">{c.contrato_venda ? `Venda ${c.contrato_venda.numero}` : '-'}</TableCell>
                      <TableCell className="text-right">{formatBR(Number(c.valor_original))}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatBR(Number(c.valor_pago))}</TableCell>
                      <TableCell className="text-right font-semibold">{formatBR(Math.max(0, saldo))}</TableCell>
                      <TableCell><Badge className={STATUS_BADGE[c.status]}>{c.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" title="Baixar" onClick={() => { setBaixaConta(c); setOpenBaixas(true); }}>
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                          </Button>
                          {canEdit && (
                            <>
                              <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpenForm(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => { if (confirm('Excluir esta conta?')) del.mutate(c.id); }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {dadosPaginados.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Nenhuma conta encontrada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {totalPaginas > 1 && (
            <div className="mt-4">
              <TablePagination
                paginaAtual={paginaAtual}
                totalPaginas={totalPaginas}
                onPaginaChange={setPaginaAtual}
                numerosPaginas={gerarNumerosPaginas()}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <ContaFormDialog
        open={openForm}
        onOpenChange={(v) => { setOpenForm(v); if (!v) setEditing(null); }}
        tipo="receber"
        initial={editing}
        onSubmit={handleSave}
      />
      <BaixasDialog
        open={openBaixas}
        onOpenChange={(v) => { setOpenBaixas(v); if (!v) setBaixaConta(null); }}
        tipo="receber"
        conta={baixaConta}
      />
    </AppLayout>
  );
}
