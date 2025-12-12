import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Ruler } from 'lucide-react';
import { useUnidadesMedida, useCreateUnidadeMedida, useUpdateUnidadeMedida, useDeleteUnidadeMedida, UnidadeMedidaInsert } from '@/hooks/useUnidadesMedida';

export default function UnidadesMedida() {
  const { canEdit } = useAuth();
  const { data: unidades, isLoading } = useUnidadesMedida();
  const createMutation = useCreateUnidadeMedida();
  const updateMutation = useUpdateUnidadeMedida();
  const deleteMutation = useDeleteUnidadeMedida();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<UnidadeMedidaInsert>({
    codigo: '',
    descricao: '',
    sigla: '',
    ativa: true,
  });

  const resetForm = () => {
    setFormData({
      codigo: '',
      descricao: '',
      sigla: '',
      ativa: true,
    });
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
      sigla: item.sigla || '',
      ativa: item.ativa,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta unidade de medida?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unidades de Medida"
        description="Gerencie as unidades de medida utilizadas no sistema"
        icon={Ruler}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lista de Unidades</CardTitle>
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Unidade
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Editar' : 'Nova'} Unidade de Medida</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Código *</Label>
                    <Input value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição *</Label>
                    <Input value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Sigla</Label>
                    <Input value={formData.sigla || ''} onChange={(e) => setFormData({ ...formData, sigla: e.target.value })} maxLength={10} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={formData.ativa ?? true} onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })} />
                    <Label>Ativa</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit">Salvar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Sigla</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {unidades?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono font-medium">{item.codigo}</TableCell>
                  <TableCell>{item.descricao}</TableCell>
                  <TableCell>{item.sigla || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={item.ativa ? 'default' : 'secondary'}>
                      {item.ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {(!unidades || unidades.length === 0) && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 5 : 4} className="text-center text-muted-foreground py-8">
                    Nenhuma unidade de medida cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
