import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useInsetos, useCreateInseto, useUpdateInseto, useDeleteInseto, InsetoInput } from '@/hooks/useInsetos';
import { format } from 'date-fns';

interface InsetosTabProps {
  controleLavouraId: string | null;
  canEdit: boolean;
}

const NIVEIS_INFESTACAO = [
  { value: 'baixo', label: 'Baixo' },
  { value: 'medio', label: 'Médio' },
  { value: 'alto', label: 'Alto' },
  { value: 'critico', label: 'Crítico' },
];

const emptyInseto: InsetoInput = {
  controle_lavoura_id: '',
  data_registro: '',
  tipo_inseto: '',
  nivel_infestacao: '',
  area_afetada: 0,
  observacoes: '',
};

export function InsetosTab({ controleLavouraId, canEdit }: InsetosTabProps) {
  const { data: insetos = [], isLoading } = useInsetos(controleLavouraId);
  const createMutation = useCreateInseto();
  const updateMutation = useUpdateInseto();
  const deleteMutation = useDeleteInseto();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<InsetoInput>(emptyInseto);

  const handleNew = () => {
    setEditingId(null);
    setFormData({ ...emptyInseto, controle_lavoura_id: controleLavouraId || '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (inseto: typeof insetos[0]) => {
    setEditingId(inseto.id);
    setFormData({
      controle_lavoura_id: inseto.controle_lavoura_id,
      data_registro: inseto.data_registro || '',
      tipo_inseto: inseto.tipo_inseto || '',
      nivel_infestacao: inseto.nivel_infestacao || '',
      area_afetada: inseto.area_afetada || 0,
      observacoes: inseto.observacoes || '',
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
        Selecione uma safra e lavoura para visualizar os registros de insetos.
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
              <TableHead>Tipo de Inseto</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead className="text-right">Área Afetada (ha)</TableHead>
              <TableHead>Observações</TableHead>
              {canEdit && <TableHead className="w-[100px]">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {insetos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground py-8">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              insetos.map((inseto) => (
                <TableRow key={inseto.id}>
                  <TableCell>{inseto.data_registro ? format(new Date(inseto.data_registro), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell>{inseto.tipo_inseto || '-'}</TableCell>
                  <TableCell>
                    {NIVEIS_INFESTACAO.find(n => n.value === inseto.nivel_infestacao)?.label || inseto.nivel_infestacao || '-'}
                  </TableCell>
                  <TableCell className="text-right">{inseto.area_afetada?.toFixed(2) || '0,00'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{inseto.observacoes || '-'}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(inseto)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(inseto.id)}>
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
            <DialogTitle>{editingId ? 'Editar Registro' : 'Novo Registro de Inseto'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data do Registro</Label>
                <Input
                  type="date"
                  value={formData.data_registro || ''}
                  onChange={(e) => setFormData({ ...formData, data_registro: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Inseto</Label>
                <Input
                  value={formData.tipo_inseto || ''}
                  onChange={(e) => setFormData({ ...formData, tipo_inseto: e.target.value })}
                  placeholder="Ex: Percevejo, Lagarta..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nível de Infestação</Label>
                <Select
                  value={formData.nivel_infestacao || ''}
                  onValueChange={(v) => setFormData({ ...formData, nivel_infestacao: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {NIVEIS_INFESTACAO.map((nivel) => (
                      <SelectItem key={nivel.value} value={nivel.value}>{nivel.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Área Afetada (ha)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.area_afetada || ''}
                  onChange={(e) => setFormData({ ...formData, area_afetada: parseFloat(e.target.value) || 0 })}
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
