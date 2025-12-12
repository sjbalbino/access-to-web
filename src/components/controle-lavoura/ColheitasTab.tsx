import { useState } from 'react';
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
import { useColheitas, useCreateColheita, useUpdateColheita, useDeleteColheita, ColheitaInput } from '@/hooks/useColheitas';
import { usePlantios } from '@/hooks/usePlantios';
import { useSilos } from '@/hooks/useSilos';
import { usePlacas } from '@/hooks/usePlacas';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ColheitasTabProps {
  controleLavouraId: string | null;
  canEdit: boolean;
}

const emptyColheita: ColheitaInput = {
  controle_lavoura_id: '',
  plantio_id: null,
  data_colheita: null,
  area_colhida: 0,
  producao_kg: 0,
  umidade: 0,
  impureza: 0,
  producao_liquida_kg: 0,
  produtividade_sacas_ha: 0,
  silo_id: null,
  placa_id: null,
  motorista: null,
  observacoes: null,
};

export function ColheitasTab({ controleLavouraId, canEdit }: ColheitasTabProps) {
  const { data: colheitas, isLoading } = useColheitas(controleLavouraId);
  const { data: plantios } = usePlantios(controleLavouraId);
  const { data: silos } = useSilos();
  const { data: placas } = usePlacas();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ColheitaInput>(emptyColheita);

  const createMutation = useCreateColheita();
  const updateMutation = useUpdateColheita();
  const deleteMutation = useDeleteColheita();

  if (!controleLavouraId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Selecione uma Safra e Lavoura no cabeçalho e clique em "Criar Registro" para habilitar o cadastro de colheitas.
        </AlertDescription>
      </Alert>
    );
  }

  const handleNew = () => {
    setFormData({
      ...emptyColheita,
      controle_lavoura_id: controleLavouraId,
    });
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (colheita: any) => {
    setFormData({
      controle_lavoura_id: colheita.controle_lavoura_id || controleLavouraId,
      plantio_id: colheita.plantio_id,
      data_colheita: colheita.data_colheita,
      area_colhida: colheita.area_colhida || 0,
      producao_kg: colheita.producao_kg || 0,
      umidade: colheita.umidade || 0,
      impureza: colheita.impureza || 0,
      producao_liquida_kg: colheita.producao_liquida_kg || 0,
      produtividade_sacas_ha: colheita.produtividade_sacas_ha || 0,
      silo_id: colheita.silo_id,
      placa_id: colheita.placa_id,
      motorista: colheita.motorista,
      observacoes: colheita.observacoes,
    });
    setEditingId(colheita.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta colheita?')) {
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
            Nova Colheita
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Área (ha)</TableHead>
                <TableHead className="text-right">Produção (kg)</TableHead>
                <TableHead className="text-right">Umidade %</TableHead>
                <TableHead className="text-right">Sacas/ha</TableHead>
                <TableHead>Destino</TableHead>
                {canEdit && <TableHead className="w-24">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {colheitas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-8">
                    Nenhuma colheita cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                colheitas?.map((colheita) => (
                  <TableRow key={colheita.id}>
                    <TableCell>
                      {colheita.data_colheita ? format(new Date(colheita.data_colheita), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">{colheita.area_colhida?.toLocaleString('pt-BR') || '0'}</TableCell>
                    <TableCell className="text-right">{colheita.producao_kg?.toLocaleString('pt-BR') || '0'}</TableCell>
                    <TableCell className="text-right">{colheita.umidade?.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) || '0'}</TableCell>
                    <TableCell className="text-right">{colheita.produtividade_sacas_ha?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0'}</TableCell>
                    <TableCell>{colheita.silos?.nome || '-'}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(colheita)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(colheita.id)}>
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
            <DialogTitle>{editingId ? 'Editar Colheita' : 'Nova Colheita'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plantio</Label>
                <Select
                  value={formData.plantio_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, plantio_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {plantios?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.data_plantio ? format(new Date(p.data_plantio), 'dd/MM/yyyy') : 'Sem data'} - {p.culturas?.nome || 'Sem cultura'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data da Colheita</Label>
                <Input
                  type="date"
                  value={formData.data_colheita || ''}
                  onChange={(e) => setFormData({ ...formData, data_colheita: e.target.value || null })}
                />
              </div>

              <div className="space-y-2">
                <Label>Área Colhida (ha)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.area_colhida || ''}
                  onChange={(e) => setFormData({ ...formData, area_colhida: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Produção (kg)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.producao_kg || ''}
                  onChange={(e) => setFormData({ ...formData, producao_kg: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Umidade (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.umidade || ''}
                  onChange={(e) => setFormData({ ...formData, umidade: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Impureza (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.impureza || ''}
                  onChange={(e) => setFormData({ ...formData, impureza: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Produção Líquida (kg)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.producao_liquida_kg || ''}
                  onChange={(e) => setFormData({ ...formData, producao_liquida_kg: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Produtividade (sacas/ha)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.produtividade_sacas_ha || ''}
                  onChange={(e) => setFormData({ ...formData, produtividade_sacas_ha: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Destino (Silo)</Label>
                <Select
                  value={formData.silo_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, silo_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {silos?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Veículo (Placa)</Label>
                <Select
                  value={formData.placa_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, placa_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {placas?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.placa}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Motorista</Label>
                <Input
                  value={formData.motorista || ''}
                  onChange={(e) => setFormData({ ...formData, motorista: e.target.value || null })}
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
