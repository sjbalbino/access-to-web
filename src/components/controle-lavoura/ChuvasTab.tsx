import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useChuvas, useCreateChuva, useUpdateChuva, useDeleteChuva, ChuvaInput } from '@/hooks/useChuvas';
import { format } from 'date-fns';

interface ChuvasTabProps {
  controleLavouraId: string | null;
  canEdit: boolean;
}

const emptyChuva: ChuvaInput = {
  controle_lavoura_id: '',
  data_chuva: '',
  quantidade_mm: 0,
  duracao_horas: 0,
  observacoes: '',
};

export function ChuvasTab({ controleLavouraId, canEdit }: ChuvasTabProps) {
  const { data: chuvas = [], isLoading } = useChuvas(controleLavouraId);
  const createMutation = useCreateChuva();
  const updateMutation = useUpdateChuva();
  const deleteMutation = useDeleteChuva();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ChuvaInput>(emptyChuva);

  const handleNew = () => {
    setEditingId(null);
    setFormData({ ...emptyChuva, controle_lavoura_id: controleLavouraId || '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (chuva: typeof chuvas[0]) => {
    setEditingId(chuva.id);
    setFormData({
      controle_lavoura_id: chuva.controle_lavoura_id,
      data_chuva: chuva.data_chuva || '',
      quantidade_mm: chuva.quantidade_mm || 0,
      duracao_horas: chuva.duracao_horas || 0,
      observacoes: chuva.observacoes || '',
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

  // Calcular totais
  const totalMm = chuvas.reduce((acc, c) => acc + (c.quantidade_mm || 0), 0);
  const totalHoras = chuvas.reduce((acc, c) => acc + (c.duracao_horas || 0), 0);

  if (!controleLavouraId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Selecione uma safra e lavoura para visualizar os registros de chuvas.
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
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Quantidade (mm)</TableHead>
              <TableHead className="text-right">Duração (horas)</TableHead>
              <TableHead>Observações</TableHead>
              {canEdit && <TableHead className="w-[100px]">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {chuvas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 5 : 4} className="text-center text-muted-foreground py-8">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              <>
                {chuvas.map((chuva) => (
                  <TableRow key={chuva.id}>
                    <TableCell>{chuva.data_chuva ? format(new Date(chuva.data_chuva), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell className="text-right">{chuva.quantidade_mm?.toFixed(1) || '0,0'}</TableCell>
                    <TableCell className="text-right">{chuva.duracao_horas?.toFixed(1) || '0,0'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{chuva.observacoes || '-'}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(chuva)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(chuva.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {/* Linha de totais */}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">{totalMm.toFixed(1)} mm</TableCell>
                  <TableCell className="text-right">{totalHoras.toFixed(1)} h</TableCell>
                  <TableCell colSpan={canEdit ? 2 : 1}></TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Registro' : 'Novo Registro de Chuva'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Data da Chuva</Label>
              <Input
                type="date"
                value={formData.data_chuva || ''}
                onChange={(e) => setFormData({ ...formData, data_chuva: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade (mm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.quantidade_mm || ''}
                  onChange={(e) => setFormData({ ...formData, quantidade_mm: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duração (horas)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.duracao_horas || ''}
                  onChange={(e) => setFormData({ ...formData, duracao_horas: parseFloat(e.target.value) || 0 })}
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
