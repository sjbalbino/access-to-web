import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useFloracoes, useCreateFloracao, useUpdateFloracao, useDeleteFloracao, FloracaoInput } from '@/hooks/useFloracoes';
import { format } from 'date-fns';

interface FloracaoTabProps {
  controleLavouraId: string | null;
  canEdit: boolean;
}

const emptyFloracao: FloracaoInput = {
  controle_lavoura_id: '',
  data_inicio: '',
  data_fim: '',
  percentual_floracao: 0,
  observacoes: '',
};

export function FloracaoTab({ controleLavouraId, canEdit }: FloracaoTabProps) {
  const { data: floracoes = [], isLoading } = useFloracoes(controleLavouraId);
  const createMutation = useCreateFloracao();
  const updateMutation = useUpdateFloracao();
  const deleteMutation = useDeleteFloracao();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FloracaoInput>(emptyFloracao);

  const handleNew = () => {
    setEditingId(null);
    setFormData({ ...emptyFloracao, controle_lavoura_id: controleLavouraId || '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (floracao: typeof floracoes[0]) => {
    setEditingId(floracao.id);
    setFormData({
      controle_lavoura_id: floracao.controle_lavoura_id,
      data_inicio: floracao.data_inicio || '',
      data_fim: floracao.data_fim || '',
      percentual_floracao: floracao.percentual_floracao || 0,
      observacoes: floracao.observacoes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja excluir este registro?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData }, { onSuccess: () => setIsDialogOpen(false) });
    } else {
      createMutation.mutate(formData, { onSuccess: () => setIsDialogOpen(false) });
    }
  };

  if (!controleLavouraId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Selecione uma safra e lavoura para visualizar os registros.
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center py-8"><Spinner className="h-8 w-8" /></div>;
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleNew} size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Novo Registro
          </Button>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data Início</TableHead>
              <TableHead>Data Fim</TableHead>
              <TableHead className="text-right">% Floração</TableHead>
              <TableHead>Observações</TableHead>
              {canEdit && <TableHead className="w-[100px]">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {floracoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 5 : 4} className="text-center text-muted-foreground py-8">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              floracoes.map((floracao) => (
                <TableRow key={floracao.id}>
                  <TableCell>{floracao.data_inicio ? format(new Date(floracao.data_inicio), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell>{floracao.data_fim ? format(new Date(floracao.data_fim), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell className="text-right">{floracao.percentual_floracao?.toFixed(1)}%</TableCell>
                  <TableCell className="max-w-[200px] truncate">{floracao.observacoes || '-'}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(floracao)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(floracao.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Registro' : 'Novo Registro de Floração'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={formData.data_inicio || ''}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={formData.data_fim || ''}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Percentual de Floração (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.percentual_floracao || ''}
                onChange={(e) => setFormData({ ...formData, percentual_floracao: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
