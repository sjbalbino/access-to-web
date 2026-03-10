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
import { Plus, Pencil, Trash2, BookOpen, Search } from 'lucide-react';
import { usePlanoContasGerencial, useCreatePlanoContaGerencial, useUpdatePlanoContaGerencial, useDeletePlanoContaGerencial, PlanoContaGerencialInput } from '@/hooks/usePlanoContasGerencial';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlanoContasGerencial() {
  const { canEdit } = useAuth();
  const { data: contas, isLoading } = usePlanoContasGerencial();
  const createMutation = useCreatePlanoContaGerencial();
  const updateMutation = useUpdatePlanoContaGerencial();
  const deleteMutation = useDeletePlanoContaGerencial();

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<PlanoContaGerencialInput>({
    codigo: '',
    descricao: '',
    ativo: true,
  });

  const filteredContas = contas?.filter(c =>
    c.codigo.toLowerCase().includes(search.toLowerCase()) ||
    c.descricao.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ codigo: '', descricao: '', ativo: true });
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
      codigo: item.codigo,
      descricao: item.descricao,
      ativo: item.ativo ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conta gerencial?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Plano de Contas Gerencial"
          description="Gerencie as contas gerenciais para vinculação com grupos de produtos"
          icon={<BookOpen className="h-6 w-6" />}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Lista de Contas
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conta..."
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
                      Nova Conta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingItem ? 'Editar' : 'Nova'} Conta Gerencial</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Código *</Label>
                        <Input
                          value={formData.codigo}
                          onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição *</Label>
                        <Input
                          value={formData.descricao}
                          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                          required
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
            ) : filteredContas && filteredContas.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    {canEdit && <TableHead className="w-24">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContas.map((conta) => (
                    <TableRow key={conta.id}>
                      <TableCell className="font-medium">{conta.codigo}</TableCell>
                      <TableCell>{conta.descricao}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          conta.ativo ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                        }`}>
                          {conta.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(conta)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(conta.id)}>
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
                <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma conta encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  {search ? 'Tente ajustar sua busca' : 'Comece cadastrando uma conta gerencial'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
