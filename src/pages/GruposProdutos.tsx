import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, FolderOpen, Search } from 'lucide-react';
import { useGruposProdutos, useCreateGrupoProduto, useUpdateGrupoProduto, useDeleteGrupoProduto, GrupoProdutoInput } from '@/hooks/useGruposProdutos';
import { Skeleton } from '@/components/ui/skeleton';

export default function GruposProdutos() {
  const { canEdit } = useAuth();
  const { data: grupos, isLoading } = useGruposProdutos();
  const createMutation = useCreateGrupoProduto();
  const updateMutation = useUpdateGrupoProduto();
  const deleteMutation = useDeleteGrupoProduto();

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<GrupoProdutoInput>({
    nome: '',
    descricao: '',
    ativo: true,
  });

  const filteredGrupos = grupos?.filter(g => 
    g.nome.toLowerCase().includes(search.toLowerCase()) ||
    g.descricao?.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ nome: '', descricao: '', ativo: true });
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      descricao: item.descricao || '',
      ativo: item.ativo ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este grupo?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Grupos de Produtos"
          description="Gerencie os grupos e categorias de produtos"
          icon={<FolderOpen className="h-6 w-6" />}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Lista de Grupos
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar grupo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {canEdit && (
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Novo Grupo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingItem ? 'Editar' : 'Novo'} Grupo</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nome *</Label>
                        <Input
                          value={formData.nome}
                          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea
                          value={formData.descricao || ''}
                          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.ativo ?? true}
                          onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                        />
                        <Label>Ativo</Label>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                          {editingItem ? 'Salvar' : 'Criar'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredGrupos && filteredGrupos.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    {canEdit && <TableHead className="w-24">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGrupos.map((grupo) => (
                    <TableRow key={grupo.id}>
                      <TableCell className="font-medium">{grupo.nome}</TableCell>
                      <TableCell>{grupo.descricao || '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          grupo.ativo ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                        }`}>
                          {grupo.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(grupo)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(grupo.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum grupo encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {search ? 'Tente ajustar sua busca' : 'Comece cadastrando um grupo'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
