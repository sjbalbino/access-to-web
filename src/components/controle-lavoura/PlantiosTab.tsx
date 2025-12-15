import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { usePlantios, useCreatePlantio, useUpdatePlantio, useDeletePlantio, PlantioInput } from '@/hooks/usePlantios';
import { useProdutosSementes } from '@/hooks/useProdutosSementes';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PlantiosTabProps {
  controleLavouraId: string | null;
  canEdit: boolean;
}

const emptyPlantio: PlantioInput = {
  controle_lavoura_id: '',
  variedade_id: null,
  data_plantio: null,
  area_plantada: 0,
  quantidade_semente: 0,
  populacao_ha: 0,
  espacamento_linha: 0,
  observacoes: null,
};

export function PlantiosTab({ controleLavouraId, canEdit }: PlantiosTabProps) {
  const { data: plantios, isLoading } = usePlantios(controleLavouraId);
  const { data: produtosSementes } = useProdutosSementes();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PlantioInput>(emptyPlantio);

  const createMutation = useCreatePlantio();
  const updateMutation = useUpdatePlantio();
  const deleteMutation = useDeletePlantio();

  // Calcular Kgs/HA automaticamente
  useEffect(() => {
    if (formData.area_plantada && formData.area_plantada > 0) {
      const kgsHa = formData.quantidade_semente / formData.area_plantada;
      setFormData(prev => ({ ...prev, populacao_ha: parseFloat(kgsHa.toFixed(2)) }));
    } else {
      setFormData(prev => ({ ...prev, populacao_ha: 0 }));
    }
  }, [formData.quantidade_semente, formData.area_plantada]);

  if (!controleLavouraId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Selecione uma Safra e Lavoura no cabeçalho e clique em "Criar Registro" para habilitar o cadastro de plantios.
        </AlertDescription>
      </Alert>
    );
  }

  const handleNew = () => {
    setFormData({
      ...emptyPlantio,
      controle_lavoura_id: controleLavouraId,
    });
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (plantio: any) => {
    setFormData({
      controle_lavoura_id: plantio.controle_lavoura_id || controleLavouraId,
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
                <TableHead>Variedade</TableHead>
                <TableHead className="text-right">Área (ha)</TableHead>
                <TableHead className="text-right">Qtd Semente</TableHead>
                <TableHead className="text-right">Kgs/HA</TableHead>
                {canEdit && <TableHead className="w-24">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {plantios?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground py-8">
                    Nenhum plantio cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                plantios?.map((plantio) => {
                  const sementeNome = produtosSementes?.find(p => p.id === plantio.variedade_id)?.nome;
                  return (
                  <TableRow key={plantio.id}>
                    <TableCell>
                      {plantio.data_plantio ? format(new Date(plantio.data_plantio), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>{sementeNome || '-'}</TableCell>
                    <TableCell className="text-right">{plantio.area_plantada?.toLocaleString('pt-BR') || '0'}</TableCell>
                    <TableCell className="text-right">{plantio.quantidade_semente?.toLocaleString('pt-BR') || '0'}</TableCell>
                    <TableCell className="text-right">{plantio.populacao_ha?.toLocaleString('pt-BR') || '0'}</TableCell>
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
                  );
                })
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
                <Label>Data do Plantio</Label>
                <Input
                  type="date"
                  value={formData.data_plantio || ''}
                  onChange={(e) => setFormData({ ...formData, data_plantio: e.target.value || null })}
                />
              </div>

              <div className="space-y-2">
                <Label>Semente</Label>
                <Select
                  value={formData.variedade_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, variedade_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a semente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {produtosSementes?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
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
                <Label>Kgs/HA</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.populacao_ha || ''}
                  readOnly
                  className="bg-muted"
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
