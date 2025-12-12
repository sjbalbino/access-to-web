import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { usePivos, useCreatePivo, useUpdatePivo, useDeletePivo, PivoInput } from '@/hooks/usePivos';
import { format } from 'date-fns';

interface PivosTabProps {
  controleLavouraId: string | null;
  canEdit: boolean;
}

const emptyPivo: PivoInput = {
  controle_lavoura_id: '',
  data_irrigacao: '',
  lamina_mm: 0,
  duracao_horas: 0,
  energia_kwh: 0,
  observacoes: '',
};

export function PivosTab({ controleLavouraId, canEdit }: PivosTabProps) {
  const { data: pivos = [], isLoading } = usePivos(controleLavouraId);
  const createMutation = useCreatePivo();
  const updateMutation = useUpdatePivo();
  const deleteMutation = useDeletePivo();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PivoInput>(emptyPivo);

  const handleNew = () => {
    setEditingId(null);
    setFormData({ ...emptyPivo, controle_lavoura_id: controleLavouraId || '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (pivo: typeof pivos[0]) => {
    setEditingId(pivo.id);
    setFormData({
      controle_lavoura_id: pivo.controle_lavoura_id,
      data_irrigacao: pivo.data_irrigacao || '',
      lamina_mm: pivo.lamina_mm || 0,
      duracao_horas: pivo.duracao_horas || 0,
      energia_kwh: pivo.energia_kwh || 0,
      observacoes: pivo.observacoes || '',
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
  const totalLamina = pivos.reduce((acc, p) => acc + (p.lamina_mm || 0), 0);
  const totalHoras = pivos.reduce((acc, p) => acc + (p.duracao_horas || 0), 0);
  const totalEnergia = pivos.reduce((acc, p) => acc + (p.energia_kwh || 0), 0);

  if (!controleLavouraId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Selecione uma safra e lavoura para visualizar os registros de irrigação.
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
              <TableHead className="text-right">Lâmina (mm)</TableHead>
              <TableHead className="text-right">Duração (h)</TableHead>
              <TableHead className="text-right">Energia (kWh)</TableHead>
              <TableHead>Observações</TableHead>
              {canEdit && <TableHead className="w-[100px]">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pivos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground py-8">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              <>
                {pivos.map((pivo) => (
                  <TableRow key={pivo.id}>
                    <TableCell>{pivo.data_irrigacao ? format(new Date(pivo.data_irrigacao), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell className="text-right">{pivo.lamina_mm?.toFixed(1) || '0,0'}</TableCell>
                    <TableCell className="text-right">{pivo.duracao_horas?.toFixed(1) || '0,0'}</TableCell>
                    <TableCell className="text-right">{pivo.energia_kwh?.toFixed(1) || '0,0'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{pivo.observacoes || '-'}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(pivo)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(pivo.id)}>
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
                  <TableCell className="text-right">{totalLamina.toFixed(1)} mm</TableCell>
                  <TableCell className="text-right">{totalHoras.toFixed(1)} h</TableCell>
                  <TableCell className="text-right">{totalEnergia.toFixed(1)} kWh</TableCell>
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
            <DialogTitle>{editingId ? 'Editar Registro' : 'Novo Registro de Irrigação'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Data da Irrigação</Label>
              <Input
                type="date"
                value={formData.data_irrigacao || ''}
                onChange={(e) => setFormData({ ...formData, data_irrigacao: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Lâmina (mm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.lamina_mm || ''}
                  onChange={(e) => setFormData({ ...formData, lamina_mm: parseFloat(e.target.value) || 0 })}
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
              <div className="space-y-2">
                <Label>Energia (kWh)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.energia_kwh || ''}
                  onChange={(e) => setFormData({ ...formData, energia_kwh: parseFloat(e.target.value) || 0 })}
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
