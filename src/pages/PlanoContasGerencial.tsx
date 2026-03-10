import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Pencil, Trash2, BookOpen, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { usePlanoContasGerencial, useCreatePlanoContaGerencial, useUpdatePlanoContaGerencial, useDeletePlanoContaGerencial, PlanoContaGerencialInput } from '@/hooks/usePlanoContasGerencial';
import { useSubCentrosCusto, useCreateSubCentroCusto, useUpdateSubCentroCusto, useDeleteSubCentroCusto, SubCentroCustoInput } from '@/hooks/useSubCentrosCusto';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function PlanoContasGerencial() {
  const { canEdit } = useAuth();
  const { data: contas, isLoading } = usePlanoContasGerencial();
  const { data: allSubCentros } = useSubCentrosCusto();
  const createMutation = useCreatePlanoContaGerencial();
  const updateMutation = useUpdatePlanoContaGerencial();
  const deleteMutation = useDeletePlanoContaGerencial();
  const createSubMutation = useCreateSubCentroCusto();
  const updateSubMutation = useUpdateSubCentroCusto();
  const deleteSubMutation = useDeleteSubCentroCusto();

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<PlanoContaGerencialInput>({ codigo: '', descricao: '', tipo: 'despesa', ordem: 0, imprimir: true, ativo: true });
  const [expandedCentros, setExpandedCentros] = useState<Record<string, boolean>>({});

  // Sub-centro dialog
  const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [subFormData, setSubFormData] = useState<SubCentroCustoInput>({ centro_custo_id: '', codigo: '', descricao: '', codigo_dre: null, tipo: 'despesa', incide_irf: false, ativo: true });

  const filteredContas = contas?.filter(c =>
    c.codigo.toLowerCase().includes(search.toLowerCase()) ||
    c.descricao.toLowerCase().includes(search.toLowerCase())
  );

  const getSubCentros = (centroId: string) => allSubCentros?.filter(s => s.centro_custo_id === centroId) || [];

  const resetForm = () => { setFormData({ codigo: '', descricao: '', tipo: 'despesa', ordem: 0, imprimir: true, ativo: true }); setEditingItem(null); };
  const resetSubForm = () => { setSubFormData({ centro_custo_id: '', codigo: '', descricao: '', codigo_dre: null, tipo: 'despesa', incide_irf: false, ativo: true }); setEditingSub(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) await updateMutation.mutateAsync({ id: editingItem.id, ...formData });
    else await createMutation.mutateAsync(formData);
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({ codigo: item.codigo, descricao: item.descricao, tipo: item.tipo || 'despesa', ordem: item.ordem ?? 0, imprimir: item.imprimir ?? true, ativo: item.ativo ?? true });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este centro de custo?')) await deleteMutation.mutateAsync(id);
  };

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSub) await updateSubMutation.mutateAsync({ id: editingSub.id, ...subFormData });
    else await createSubMutation.mutateAsync(subFormData);
    setIsSubDialogOpen(false);
    resetSubForm();
  };

  const handleEditSub = (sub: any) => {
    setEditingSub(sub);
    setSubFormData({ centro_custo_id: sub.centro_custo_id, codigo: sub.codigo, descricao: sub.descricao, codigo_dre: sub.codigo_dre, ativo: sub.ativo ?? true });
    setIsSubDialogOpen(true);
  };

  const handleDeleteSub = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este sub-centro?')) await deleteSubMutation.mutateAsync(id);
  };

  const openNewSub = (centroId: string) => {
    resetSubForm();
    setSubFormData(prev => ({ ...prev, centro_custo_id: centroId }));
    setIsSubDialogOpen(true);
  };

  const toggleExpand = (id: string) => setExpandedCentros(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader title="Plano de Contas Gerencial" description="Centros de Custo e Sub-Centros para classificação financeira" icon={<BookOpen className="h-6 w-6" />} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />Centros de Custo</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              {canEdit && (
                <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                  <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Novo Centro</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editingItem ? 'Editar' : 'Novo'} Centro de Custo</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2"><Label>Código *</Label><Input value={formData.codigo} onChange={e => setFormData({ ...formData, codigo: e.target.value })} required /></div>
                      <div className="space-y-2"><Label>Descrição *</Label><Input value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} required /></div>
                      <div className="space-y-2">
                        <Label>Tipo *</Label>
                        <Select value={formData.tipo || 'despesa'} onValueChange={v => setFormData({ ...formData, tipo: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="receita">Receita</SelectItem>
                            <SelectItem value="despesa">Despesa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2"><Switch checked={formData.ativo ?? true} onCheckedChange={checked => setFormData({ ...formData, ativo: checked })} /><Label>Ativo</Label></div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{editingItem ? 'Salvar' : 'Criar'}</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filteredContas && filteredContas.length > 0 ? (
              <div className="space-y-1">
                {filteredContas.map(conta => {
                  const subs = getSubCentros(conta.id);
                  const isExpanded = expandedCentros[conta.id];
                  return (
                    <div key={conta.id} className="border rounded-lg">
                      <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 cursor-pointer" onClick={() => toggleExpand(conta.id)}>
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          <span className="font-mono font-medium text-sm">{conta.codigo}</span>
                          <span className="font-medium">{conta.descricao}</span>
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', conta.tipo === 'receita' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                            {conta.tipo === 'receita' ? 'Receita' : 'Despesa'}
                          </span>
                          {!conta.ativo && <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">Inativo</span>}
                          <span className="text-xs text-muted-foreground">({subs.length} sub-centros)</span>
                        </div>
                        {canEdit && (
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" onClick={() => openNewSub(conta.id)}><Plus className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(conta)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(conta.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        )}
                      </div>
                      {isExpanded && subs.length > 0 && (
                        <div className="border-t bg-muted/20 px-4 py-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Código DRE</TableHead>
                                <TableHead>Status</TableHead>
                                {canEdit && <TableHead className="w-24">Ações</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {subs.map(sub => (
                                <TableRow key={sub.id}>
                                  <TableCell className="font-mono text-sm">{sub.codigo}</TableCell>
                                  <TableCell>{sub.descricao}</TableCell>
                                  <TableCell className="font-mono text-sm">{sub.codigo_dre || '-'}</TableCell>
                                  <TableCell>
                                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', sub.ativo ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                                      {sub.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                  </TableCell>
                                  {canEdit && (
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditSub(sub)}><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSub(sub.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                      </div>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      {isExpanded && subs.length === 0 && (
                        <div className="border-t bg-muted/20 px-4 py-4 text-center text-sm text-muted-foreground">
                          Nenhum sub-centro cadastrado.
                          {canEdit && <Button variant="link" size="sm" onClick={() => openNewSub(conta.id)}>Adicionar sub-centro</Button>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum centro de custo encontrado</h3>
                <p className="text-muted-foreground mb-4">{search ? 'Tente ajustar sua busca' : 'Comece cadastrando um centro de custo'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sub-Centro Dialog */}
      <Dialog open={isSubDialogOpen} onOpenChange={open => { setIsSubDialogOpen(open); if (!open) resetSubForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSub ? 'Editar' : 'Novo'} Sub-Centro de Custo</DialogTitle></DialogHeader>
          <form onSubmit={handleSubSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Código *</Label><Input value={subFormData.codigo} onChange={e => setSubFormData({ ...subFormData, codigo: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Descrição *</Label><Input value={subFormData.descricao} onChange={e => setSubFormData({ ...subFormData, descricao: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Código DRE</Label><Input value={subFormData.codigo_dre || ''} onChange={e => setSubFormData({ ...subFormData, codigo_dre: e.target.value || null })} /></div>
            <div className="flex items-center gap-2"><Switch checked={subFormData.ativo ?? true} onCheckedChange={checked => setSubFormData({ ...subFormData, ativo: checked })} /><Label>Ativo</Label></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsSubDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createSubMutation.isPending || updateSubMutation.isPending}>{editingSub ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
