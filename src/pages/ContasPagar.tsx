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
import { Plus, Pencil, Trash2, DollarSign, ListOrdered } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useGranjas } from '@/hooks/useGranjas';
import { useClientesFornecedores } from '@/hooks/useClientesFornecedores';
import {
  useContasPagar,
  useCreateContaPagar,
  useUpdateContaPagar,
  useDeleteContaPagar,
  useGerarParcelasPagar,
} from '@/hooks/useContasPagar';
import { usePaginacao } from '@/hooks/usePaginacao';
import { TablePagination } from '@/components/ui/table-pagination';
import { ContaFormDialog } from '@/components/contas/ContaFormDialog';
import { BaixasDialog } from '@/components/contas/BaixasDialog';
import { GerarParcelasDialog } from '@/components/contas/GerarParcelasDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const formatBR = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_BADGE: Record<string, string> = {
  aberto: 'bg-sky-100 text-sky-700',
  parcial: 'bg-amber-100 text-amber-700',
  pago: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-muted text-muted-foreground',
};

export default function ContasPagar() {
  const { canEdit } = useAuth();
  const { data: granjas } = useGranjas();
  const { data: fornecedores } = useClientesFornecedores();

  const [filtroGranja, setFiltroGranja] = useState<string | undefined>();
  const [filtroStatus, setFiltroStatus] = useState<string | undefined>();
  const [filtroFornec, setFiltroFornec] = useState<string | undefined>();
  const [vencDe, setVencDe] = useState('');
  const [vencAte, setVencAte] = useState('');
  const [busca, setBusca] = useState('');

  const { data: contas, isLoading } = useContasPagar({
    granjaId: filtroGranja,
    status: filtroStatus,
    fornecedorId: filtroFornec,
    vencimentoDe: vencDe || undefined,
    vencimentoAte: vencAte || undefined,
    busca: busca || undefined,
  });

  const create = useCreateContaPagar();
  const update = useUpdateContaPagar();
  const del = useDeleteContaPagar();
  const gerarParcelas = useGerarParcelasPagar();

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [openBaixas, setOpenBaixas] = useState(false);
  const [baixaConta, setBaixaConta] = useState<any>(null);
  const [openGerar, setOpenGerar] = useState(false);
  const [valorGerar, setValorGerar] = useState(0);

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

  const paginacao = usePaginacao(contas || [], 20);
  const { dadosPaginados, totalPaginas } = paginacao;

  const handleSave = async (data: any) => {
    let saved: any;
    if (data._isBatch) {
      const { _isBatch, ...config } = data;
      await gerarParcelas.mutateAsync(config);
      return;
    }
    if (editing?.id) saved = await update.mutateAsync({ id: editing.id, ...data });
    else saved = await create.mutateAsync(data);
    setEditing(null);
    return saved;
  };


  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <AppLayout>
      <PageHeader title="Contas a Pagar" description="Títulos a pagar e baixas de pagamento" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Em aberto</div><div className="text-lg font-bold text-sky-600">{formatBR(totais.aberto)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Vencido</div><div className="text-lg font-bold text-destructive">{formatBR(totais.vencido)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">A vencer (7 dias)</div><div className="text-lg font-bold text-amber-600">{formatBR(totais.aVencer)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Pago no mês</div><div className="text-lg font-bold text-emerald-600">{formatBR(totais.pagoMes)}</div></CardContent></Card>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <Label>Granja</Label>
            <Select isSearchable value={filtroGranja} onValueChange={(v) => setFiltroGranja(v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas</SelectItem>{granjas?.map(g => <SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select isSearchable value={filtroStatus} onValueChange={(v) => setFiltroStatus(v === 'all' ? undefined : v)}>
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
            <Label>Fornecedor</Label>
            <Select isSearchable value={filtroFornec} onValueChange={(v) => setFiltroFornec(v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem>{fornecedores?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Venc. de</Label><Input type="date" value={vencDe} onChange={(e) => setVencDe(e.target.value)} /></div>
          <div><Label>Venc. até</Label><Input type="date" value={vencAte} onChange={(e) => setVencAte(e.target.value)} /></div>
          <div><Label>Documento</Label><Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 mb-3">
        {canEdit && (
          <>
            <Button variant="outline" onClick={() => { 
              const val = prompt('Digite o valor total para gerar parcelas:');
              if (val && !isNaN(Number(val))) {
                setValorGerar(Number(val));
                setOpenGerar(true);
              }
            }}>
              <ListOrdered className="h-4 w-4 mr-2" /> Gerar parcelas
            </Button>
            <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nova conta
            </Button>
          </>
        )}
      </div>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? <Skeleton className="h-40" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Fornecedor</TableHead>
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
                      <TableCell>{c.fornecedor?.nome || '-'}</TableCell>
                      <TableCell>{c.documento || '-'}{c.parcela ? ` (${c.parcela})` : ''}</TableCell>
                      <TableCell className="text-xs">{c.entrada_nfe ? `NF-e ${c.entrada_nfe.numero_nfe}` : '-'}</TableCell>
                      <TableCell className="text-right">{formatBR(Number(c.valor_original))}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatBR(Number(c.valor_pago))}</TableCell>
                      <TableCell className="text-right font-semibold">{formatBR(Math.max(0, saldo))}</TableCell>
                      <TableCell><Badge className={STATUS_BADGE[c.status]}>{c.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {c.status !== 'pago' && (
                            <Button size="icon" variant="ghost" title="Baixar" onClick={() => { setBaixaConta(c); setOpenBaixas(true); }}>
                              <DollarSign className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
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
            <TablePagination
              paginaAtual={paginacao.paginaAtual}
              totalPaginas={paginacao.totalPaginas}
              totalRegistros={paginacao.totalRegistros}
              setPaginaAtual={paginacao.setPaginaAtual}
              gerarNumerosPaginas={paginacao.gerarNumerosPaginas}
            />
          )}
        </CardContent>
      </Card>

      <ContaFormDialog
        open={openForm}
        onOpenChange={(v) => { setOpenForm(v); if (!v) setEditing(null); }}
        tipo="pagar"
        initial={editing}
        onSubmit={handleSave}
      />
      <BaixasDialog
        open={openBaixas}
        onOpenChange={(v) => { setOpenBaixas(v); if (!v) setBaixaConta(null); }}
        tipo="pagar"
        conta={baixaConta}
      />
      <GerarParcelasDialog
        open={openGerar}
        onOpenChange={setOpenGerar}
        tipo="pagar"
        valorTotal={valorGerar}
        onGerar={async (config) => {
          await gerarParcelas.mutateAsync({
            granja_id: filtroGranja || (granjas?.find(g => g.is_principal) || granjas?.[0])?.id || '',
            valor_total: valorGerar,
            num_parcelas: config.num_parcelas,
            primeiro_vencimento: config.primeiro_vencimento,
            intervalo_dias: config.intervalo_dias,
            ja_pago: config.ja_pago,
          });
        }}
      />
    </AppLayout>
  );
}
