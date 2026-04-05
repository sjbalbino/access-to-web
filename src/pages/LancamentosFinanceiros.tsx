import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, DollarSign, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { useLancamentosFinanceiros, useCreateLancamento, useUpdateLancamento, useDeleteLancamento, LancamentoFinanceiroInput } from '@/hooks/useLancamentosFinanceiros';
import { useAllSubCentrosCusto } from '@/hooks/useSubCentrosCusto';
import { useDreContas } from '@/hooks/useDreContas';
import { useGranjas } from '@/hooks/useGranjas';
import { useClientesFornecedores } from '@/hooks/useClientesFornecedores';
import { useSafras } from '@/hooks/useSafras';
import { usePlanoContasGerencial } from '@/hooks/usePlanoContasGerencial';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { usePaginacao } from "@/hooks/usePaginacao";
import { TablePagination } from "@/components/ui/table-pagination";
import { ComboboxFilter } from "@/components/ui/combobox-filter";

export default function LancamentosFinanceiros() {
  const { canEdit } = useAuth();
  const { data: granjas } = useGranjas();
  const { data: subCentros } = useAllSubCentrosCusto();
  const { data: dreContas } = useDreContas();
  const { data: clientes } = useClientesFornecedores();
  const { data: safras } = useSafras();
  const { data: centrosCusto } = usePlanoContasGerencial();

  // Filters
  const [filtroGranja, setFiltroGranja] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroDataIni, setFiltroDataIni] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroSafra, setFiltroSafra] = useState('');

  const { data: lancamentos, isLoading } = useLancamentosFinanceiros({
    granjaId: filtroGranja || undefined,
    tipo: filtroTipo || undefined,
    dataInicial: filtroDataIni || undefined,
    dataFinal: filtroDataFim || undefined,
    safraId: filtroSafra || undefined,
  });

  const createMutation = useCreateLancamento();
  const updateMutation = useUpdateLancamento();
  const deleteMutation = useDeleteLancamento();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<LancamentoFinanceiroInput>({
    granja_id: '', data_lancamento: new Date().toISOString().split('T')[0], sub_centro_custo_id: null,
    dre_conta_id: null, descricao: '', valor: 0, tipo: 'despesa', fornecedor_id: null,
    documento: null, observacoes: null, safra_id: null,
  });

  const resetForm = () => {
    setFormData({
      granja_id: granjas?.[0]?.id || '', data_lancamento: new Date().toISOString().split('T')[0],
      sub_centro_custo_id: null, dre_conta_id: null, descricao: '', valor: 0, tipo: 'despesa',
      fornecedor_id: null, documento: null, observacoes: null, safra_id: null,
    });
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) await updateMutation.mutateAsync({ id: editingItem.id, ...formData });
    else await createMutation.mutateAsync(formData);
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      granja_id: item.granja_id, data_lancamento: item.data_lancamento,
      sub_centro_custo_id: item.sub_centro_custo_id, dre_conta_id: item.dre_conta_id,
      descricao: item.descricao, valor: item.valor, tipo: item.tipo,
      fornecedor_id: item.fornecedor_id, documento: item.documento,
      observacoes: item.observacoes, safra_id: item.safra_id,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Excluir este lançamento?')) await deleteMutation.mutateAsync(id);
  };

  const totalReceitas = lancamentos?.filter(l => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0) || 0;
  const totalDespesas = lancamentos?.filter(l => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0) || 0;

  // Group sub-centros by centro de custo for the select
  const subCentrosByCentro = centrosCusto?.map(c => ({
    centro: c,
    subs: subCentros?.filter(s => s.plano_contas_gerencial?.codigo === c.codigo) || [],
  })).filter(g => g.subs.length > 0) || [];

  const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => { try { return format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy'); } catch { return d; } };

  const {
    dadosPaginados,
    paginaAtual,
    totalPaginas,
    totalRegistros,
    setPaginaAtual,
    gerarNumerosPaginas,
  } = usePaginacao(lancamentos || []);


  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader title="Lançamentos Financeiros" description="Registre receitas e despesas do período" icon={<DollarSign className="h-6 w-6" />} />

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-success" /><div><p className="text-sm text-muted-foreground">Total Receitas</p><p className="text-2xl font-bold text-success">{fmtCurrency(totalReceitas)}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingDown className="h-8 w-8 text-destructive" /><div><p className="text-sm text-muted-foreground">Total Despesas</p><p className="text-2xl font-bold text-destructive">{fmtCurrency(totalDespesas)}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><DollarSign className={cn("h-8 w-8", totalReceitas - totalDespesas >= 0 ? 'text-success' : 'text-destructive')} /><div><p className="text-sm text-muted-foreground">Resultado</p><p className={cn("text-2xl font-bold", totalReceitas - totalDespesas >= 0 ? 'text-success' : 'text-destructive')}>{fmtCurrency(totalReceitas - totalDespesas)}</p></div></div></CardContent></Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Granja</Label>
                <ComboboxFilter
                  value={filtroGranja}
                  onValueChange={setFiltroGranja}
                  options={granjas?.map(g => ({ value: g.id, label: g.razao_social })) || []}
                  searchPlaceholder="Buscar granja..."
                  emptyText="Nenhuma granja encontrada."
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Tipo</Label>
                <ComboboxFilter
                  value={filtroTipo}
                  onValueChange={setFiltroTipo}
                  options={[
                    { value: 'receita', label: 'Receita' },
                    { value: 'despesa', label: 'Despesa' },
                  ]}
                  searchPlaceholder="Buscar tipo..."
                  emptyText="Nenhum tipo encontrado."
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Safra</Label>
                <ComboboxFilter
                  value={filtroSafra}
                  onValueChange={setFiltroSafra}
                  options={safras?.map(s => ({ value: s.id, label: s.nome })) || []}
                  searchPlaceholder="Buscar safra..."
                  emptyText="Nenhuma safra encontrada."
                />
              </div>
              <Input type="date" value={filtroDataIni} onChange={e => setFiltroDataIni(e.target.value)} placeholder="Data inicial" />
              <Input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} placeholder="Data final" />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Lançamentos</CardTitle>
            {canEdit && <Button className="gap-2" onClick={() => { resetForm(); setIsDialogOpen(true); }}><Plus className="h-4 w-4" />Novo Lançamento</Button>}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : lancamentos && lancamentos.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="hidden md:table-cell">Centro/Sub</TableHead>
                    <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="hidden lg:table-cell">Fornecedor</TableHead>
                    <TableHead className="hidden lg:table-cell">Doc.</TableHead>
                    {canEdit && <TableHead className="w-24 sticky right-0 bg-background">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dadosPaginados.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="whitespace-nowrap">{fmtDate(l.data_lancamento)}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{l.descricao}</TableCell>
                        <TableCell className="text-sm hidden md:table-cell">
                          {l.sub_centros_custo ? (
                            <span>{l.sub_centros_custo.plano_contas_gerencial?.descricao} → {l.sub_centros_custo.descricao}</span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', l.tipo === 'receita' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                            {l.tipo === 'receita' ? 'Receita' : 'Despesa'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">{fmtCurrency(Number(l.valor))}</TableCell>
                        <TableCell className="text-sm hidden lg:table-cell">{l.clientes_fornecedores?.nome_fantasia ? `${l.clientes_fornecedores.nome} (${l.clientes_fornecedores.nome_fantasia})` : l.clientes_fornecedores?.nome || '-'}</TableCell>
                        <TableCell className="text-sm hidden lg:table-cell">{l.documento || '-'}</TableCell>
                        {canEdit && (
                          <TableCell className="sticky right-0 bg-background">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(l)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            <TablePagination
              paginaAtual={paginaAtual}
              totalPaginas={totalPaginas}
              totalRegistros={totalRegistros}
              setPaginaAtual={setPaginaAtual}
              gerarNumerosPaginas={gerarNumerosPaginas}
            />
              </div>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum lançamento encontrado</h3>
                <p className="text-muted-foreground">Ajuste os filtros ou cadastre um novo lançamento</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingItem ? 'Editar' : 'Novo'} Lançamento</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={formData.data_lancamento} onChange={e => setFormData({ ...formData, data_lancamento: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={formData.tipo} onValueChange={v => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="receita">Receita</SelectItem><SelectItem value="despesa">Despesa</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Descrição *</Label><Input value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input type="number" step="0.01" min="0" value={formData.valor} onChange={e => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div className="space-y-2">
                <Label>Granja *</Label>
                <Select value={formData.granja_id} onValueChange={v => setFormData({ ...formData, granja_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{granjas?.map(g => <SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sub-Centro de Custo</Label>
              <Select value={formData.sub_centro_custo_id || 'none'} onValueChange={v => setFormData({ ...formData, sub_centro_custo_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {subCentrosByCentro.map(g => (
                    <div key={g.centro.id}>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{g.centro.codigo} - {g.centro.descricao}</div>
                      {g.subs.map(s => <SelectItem key={s.id} value={s.id}>&nbsp;&nbsp;{s.codigo} - {s.descricao}</SelectItem>)}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conta DRE</Label>
              <Select value={formData.dre_conta_id || 'none'} onValueChange={v => setFormData({ ...formData, dre_conta_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {dreContas?.map(d => <SelectItem key={d.id} value={d.id}>{d.codigo} - {d.descricao}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Select value={formData.fornecedor_id || 'none'} onValueChange={v => setFormData({ ...formData, fornecedor_id: v === 'none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Nenhum</SelectItem>{clientes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}{c.nome_fantasia ? ` (${c.nome_fantasia})` : ''}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Safra</Label>
                <Select value={formData.safra_id || 'none'} onValueChange={v => setFormData({ ...formData, safra_id: v === 'none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{safras?.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Documento</Label><Input value={formData.documento || ''} onChange={e => setFormData({ ...formData, documento: e.target.value || null })} /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={formData.observacoes || ''} onChange={e => setFormData({ ...formData, observacoes: e.target.value || null })} rows={2} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{editingItem ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
