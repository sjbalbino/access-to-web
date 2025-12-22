import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Truck, Car, User } from 'lucide-react';
import { usePlacas, useCreatePlaca, useUpdatePlaca, useDeletePlaca, PlacaInsert } from '@/hooks/usePlacas';
import { useGranjas } from '@/hooks/useGranjas';

export default function Placas() {
  const { canEdit } = useAuth();
  const { data: placas, isLoading } = usePlacas();
  const { data: granjas } = useGranjas();
  const createMutation = useCreatePlaca();
  const updateMutation = useUpdatePlaca();
  const deleteMutation = useDeletePlaca();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<PlacaInsert>({
    granja_id: null,
    placa: '',
    tipo: 'veiculo',
    marca: '',
    modelo: '',
    ano: null,
    cor: '',
    capacidade_kg: 0,
    proprietario: '',
    observacoes: '',
    ativa: true,
  });

  const resetForm = () => {
    setFormData({
      granja_id: null,
      placa: '',
      tipo: 'veiculo',
      marca: '',
      modelo: '',
      ano: null,
      cor: '',
      capacidade_kg: 0,
      proprietario: '',
      observacoes: '',
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
      granja_id: item.granja_id,
      placa: item.placa,
      tipo: item.tipo || 'veiculo',
      marca: item.marca || '',
      modelo: item.modelo || '',
      ano: item.ano,
      cor: item.cor || '',
      capacidade_kg: item.capacidade_kg || 0,
      proprietario: item.proprietario || '',
      observacoes: item.observacoes || '',
      ativa: item.ativa,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta placa?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const getTipoBadge = (tipo: string | null) => {
    switch (tipo) {
      case 'veiculo':
        return <Badge className="bg-sky-500">Veículo</Badge>;
      case 'carreta':
        return <Badge className="bg-amber-500">Carreta</Badge>;
      case 'implemento':
        return <Badge className="bg-emerald-500">Implemento</Badge>;
      default:
        return <Badge>{tipo}</Badge>;
    }
  };

  const formatNumber = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('pt-BR');
  };

  if (isLoading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <AppLayout>
    <div className="space-y-6">
      <PageHeader
        title="Placas / Veículos"
        description="Gerencie as placas de veículos e carretas"
        icon={<Truck className="h-6 w-6" />}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Lista de Placas
          </CardTitle>
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Placa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Editar' : 'Nova'} Placa</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Placa *</Label>
                      <Input value={formData.placa} onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })} required placeholder="ABC1D23" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={formData.tipo || 'veiculo'} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="veiculo">Veículo</SelectItem>
                          <SelectItem value="carreta">Carreta</SelectItem>
                          <SelectItem value="implemento">Implemento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Granja</Label>
                      <Select value={formData.granja_id || ''} onValueChange={(value) => setFormData({ ...formData, granja_id: value || null })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {granjas?.map((granja) => (
                            <SelectItem key={granja.id} value={granja.id}>{granja.razao_social}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Marca</Label>
                      <Input value={formData.marca || ''} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Modelo</Label>
                      <Input value={formData.modelo || ''} onChange={(e) => setFormData({ ...formData, modelo: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Ano</Label>
                      <Input type="number" value={formData.ano || ''} onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) || null })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Cor</Label>
                      <Input value={formData.cor || ''} onChange={(e) => setFormData({ ...formData, cor: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Capacidade (Kg)</Label>
                      <Input type="number" step="0.01" value={formData.capacidade_kg || ''} onChange={(e) => setFormData({ ...formData, capacidade_kg: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Proprietário</Label>
                      <Input value={formData.proprietario || ''} onChange={(e) => setFormData({ ...formData, proprietario: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea value={formData.observacoes || ''} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} />
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
                <TableHead>Placa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Marca/Modelo</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead className="text-right">Cap. (Kg)</TableHead>
                <TableHead>Proprietário</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {placas?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono font-bold text-primary">{item.placa}</TableCell>
                  <TableCell>{getTipoBadge(item.tipo)}</TableCell>
                  <TableCell>
                    {item.marca || item.modelo ? `${item.marca || ''} ${item.modelo || ''}`.trim() : '-'}
                  </TableCell>
                  <TableCell>{item.ano || '-'}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.capacidade_kg)}</TableCell>
                  <TableCell>
                    {item.proprietario && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {item.proprietario}
                      </span>
                    )}
                  </TableCell>
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
              {(!placas || placas.length === 0) && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground py-8">
                    Nenhuma placa cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </AppLayout>
  );
}
