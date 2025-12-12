import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useAnalisesSolo, useCreateAnaliseSolo, useUpdateAnaliseSolo, useDeleteAnaliseSolo, AnaliseSoloInput } from '@/hooks/useAnalisesSolo';
import { format } from 'date-fns';

interface AnaliseTabProps {
  controleLavouraId: string | null;
  canEdit: boolean;
}

const emptyAnalise: AnaliseSoloInput = {
  controle_lavoura_id: '',
  data_coleta: '',
  laboratorio: '',
  ph: null,
  materia_organica: null,
  fosforo: null,
  potassio: null,
  calcio: null,
  magnesio: null,
  observacoes: '',
};

export function AnaliseTab({ controleLavouraId, canEdit }: AnaliseTabProps) {
  const { data: analises = [], isLoading } = useAnalisesSolo(controleLavouraId);
  const createMutation = useCreateAnaliseSolo();
  const updateMutation = useUpdateAnaliseSolo();
  const deleteMutation = useDeleteAnaliseSolo();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AnaliseSoloInput>(emptyAnalise);

  const handleNew = () => {
    setEditingId(null);
    setFormData({ ...emptyAnalise, controle_lavoura_id: controleLavouraId || '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (analise: typeof analises[0]) => {
    setEditingId(analise.id);
    setFormData({
      controle_lavoura_id: analise.controle_lavoura_id,
      data_coleta: analise.data_coleta || '',
      laboratorio: analise.laboratorio || '',
      ph: analise.ph,
      materia_organica: analise.materia_organica,
      fosforo: analise.fosforo,
      potassio: analise.potassio,
      calcio: analise.calcio,
      magnesio: analise.magnesio,
      observacoes: analise.observacoes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja excluir esta análise?')) {
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
        Selecione uma safra e lavoura para visualizar as análises de solo.
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
            <Plus className="h-4 w-4" /> Nova Análise
          </Button>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data Coleta</TableHead>
              <TableHead>Laboratório</TableHead>
              <TableHead className="text-right">pH</TableHead>
              <TableHead className="text-right">M.O.</TableHead>
              <TableHead className="text-right">P</TableHead>
              <TableHead className="text-right">K</TableHead>
              <TableHead className="text-right">Ca</TableHead>
              <TableHead className="text-right">Mg</TableHead>
              {canEdit && <TableHead className="w-[100px]">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {analises.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 9 : 8} className="text-center text-muted-foreground py-8">
                  Nenhuma análise encontrada
                </TableCell>
              </TableRow>
            ) : (
              analises.map((analise) => (
                <TableRow key={analise.id}>
                  <TableCell>{analise.data_coleta ? format(new Date(analise.data_coleta), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell>{analise.laboratorio || '-'}</TableCell>
                  <TableCell className="text-right">{analise.ph?.toFixed(2) || '-'}</TableCell>
                  <TableCell className="text-right">{analise.materia_organica?.toFixed(2) || '-'}</TableCell>
                  <TableCell className="text-right">{analise.fosforo?.toFixed(2) || '-'}</TableCell>
                  <TableCell className="text-right">{analise.potassio?.toFixed(2) || '-'}</TableCell>
                  <TableCell className="text-right">{analise.calcio?.toFixed(2) || '-'}</TableCell>
                  <TableCell className="text-right">{analise.magnesio?.toFixed(2) || '-'}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(analise)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(analise.id)}>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Análise' : 'Nova Análise de Solo'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data da Coleta</Label>
                <Input
                  type="date"
                  value={formData.data_coleta || ''}
                  onChange={(e) => setFormData({ ...formData, data_coleta: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Laboratório</Label>
                <Input
                  value={formData.laboratorio || ''}
                  onChange={(e) => setFormData({ ...formData, laboratorio: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>pH</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.ph ?? ''}
                  onChange={(e) => setFormData({ ...formData, ph: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Matéria Orgânica (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.materia_organica ?? ''}
                  onChange={(e) => setFormData({ ...formData, materia_organica: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fósforo (mg/dm³)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fosforo ?? ''}
                  onChange={(e) => setFormData({ ...formData, fosforo: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Potássio (cmol/dm³)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.potassio ?? ''}
                  onChange={(e) => setFormData({ ...formData, potassio: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cálcio (cmol/dm³)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.calcio ?? ''}
                  onChange={(e) => setFormData({ ...formData, calcio: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Magnésio (cmol/dm³)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.magnesio ?? ''}
                  onChange={(e) => setFormData({ ...formData, magnesio: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
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
