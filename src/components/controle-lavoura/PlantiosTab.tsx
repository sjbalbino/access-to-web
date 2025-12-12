import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { usePlantios, useCreatePlantio, useUpdatePlantio, useDeletePlantio, PlantioInput } from '@/hooks/usePlantios';
import { useSafras } from '@/hooks/useSafras';
import { useLavouras } from '@/hooks/useLavouras';
import { useCulturas } from '@/hooks/useCulturas';
import { useVariedades } from '@/hooks/useVariedades';
import { format } from 'date-fns';

interface PlantiosTabProps {
  safraId: string | null;
  lavouraId: string | null;
}

const emptyPlantio: PlantioInput = {
  safra_id: null,
  lavoura_id: '',
  cultura_id: null,
  variedade_id: null,
  data_plantio: null,
  area_plantada: 0,
  quantidade_semente: 0,
  populacao_ha: 0,
  espacamento_linha: 0,
  observacoes: null,
};

export function PlantiosTab({ safraId, lavouraId }: PlantiosTabProps) {
  const { canEdit } = useAuth();
  const { data: plantios, isLoading } = usePlantios(safraId, lavouraId);
  const { data: safras } = useSafras();
  const { data: lavouras } = useLavouras();
  const { data: culturas } = useCulturas();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PlantioInput>(emptyPlantio);
  
  const { data: variedades } = useVariedades(formData.cultura_id);

  const createMutation = useCreatePlantio();
  const updateMutation = useUpdatePlantio();
  const deleteMutation = useDeletePlantio();

  const handleNew = () => {
    setFormData({
      ...emptyPlantio,
      safra_id: safraId,
      lavoura_id: lavouraId || '',
    });
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (plantio: any) => {
    setFormData({
      safra_id: plantio.safra_id,
      lavoura_id: plantio.lavoura_id,
      cultura_id: plantio.cultura_id,
      variedade_id: plantio.variedade_id,
      data_plantio: plantio.data_plantio,
      area_plantada: plantio.area_plantada || 0,
      quantidade_semente: plantio.quantidade_semente || 0,
      populacao_ha: plantio.populacao_ha || 0,
      espacamento_linha: plantio.espacamento_linha || 0,
      observacoes: plantio.observacoes,
    });
    setEditingId(plantio.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este plantio?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData }, {
        onSuccess: () => setIsDialogOpen(false),
      });
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => setIsDialogOpen(false),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Plantio
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Lavoura</TableHead>
                <TableHead>Cultura</TableHead>
                <TableHead>Variedade</TableHead>
                <TableHead className="text-right">Área (ha)</TableHead>
                <TableHead className="text-right">Qtd Semente</TableHead>
                {canEdit && <TableHead className="w-24">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {plantios?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-8">
                    Nenhum plantio cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                plantios?.map((plantio) => (
                  <TableRow key={plantio.id}>
                    <TableCell>
                      {plantio.data_plantio ? format(new Date(plantio.data_plantio), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>{plantio.lavouras?.nome || '-'}</TableCell>
                    <TableCell>{plantio.culturas?.nome || '-'}</TableCell>
                    <TableCell>{plantio.variedades?.nome || '-'}</TableCell>
                    <TableCell className="text-right">{plantio.area_plantada?.toLocaleString('pt-BR') || '0'}</TableCell>
                    <TableCell className="text-right">{plantio.quantidade_semente?.toLocaleString('pt-BR') || '0'}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(plantio)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(plantio.id)}>
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
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Plantio' : 'Novo Plantio'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Safra</Label>
                <Select
                  value={formData.safra_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, safra_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {safras?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lavoura *</Label>
                <Select
                  value={formData.lavoura_id || ""}
                  onValueChange={(value) => setFormData({ ...formData, lavoura_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {lavouras?.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data do Plantio</Label>
                <Input
                  type="date"
                  value={formData.data_plantio || ''}
                  onChange={(e) => setFormData({ ...formData, data_plantio: e.target.value || null })}
                />
              </div>

              <div className="space-y-2">
                <Label>Cultura</Label>
                <Select
                  value={formData.cultura_id || "none"}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    cultura_id: value === "none" ? null : value,
                    variedade_id: null 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {culturas?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Variedade</Label>
                <Select
                  value={formData.variedade_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, variedade_id: value === "none" ? null : value })}
                  disabled={!formData.cultura_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.cultura_id ? "Selecione" : "Selecione a cultura primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {variedades?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Área Plantada (ha)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.area_plantada || ''}
                  onChange={(e) => setFormData({ ...formData, area_plantada: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Quantidade de Semente (kg)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.quantidade_semente || ''}
                  onChange={(e) => setFormData({ ...formData, quantidade_semente: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>População/ha</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.populacao_ha || ''}
                  onChange={(e) => setFormData({ ...formData, populacao_ha: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Espaçamento entre Linhas (cm)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.espacamento_linha || ''}
                  onChange={(e) => setFormData({ ...formData, espacamento_linha: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value || null })}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
