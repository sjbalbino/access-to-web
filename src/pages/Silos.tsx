import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import { Plus, Pencil, Trash2, Warehouse, MapPin } from 'lucide-react';
import { useSilos, useCreateSilo, useUpdateSilo, useDeleteSilo, SiloInsert } from '@/hooks/useSilos';
import { useEmpresas } from '@/hooks/useEmpresas';

export default function Silos() {
  const { canEdit } = useAuth();
  const { data: silos, isLoading } = useSilos();
  const { data: empresas } = useEmpresas();
  const createMutation = useCreateSilo();
  const updateMutation = useUpdateSilo();
  const deleteMutation = useDeleteSilo();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<SiloInsert>({
    empresa_id: null,
    codigo: '',
    nome: '',
    capacidade_kg: 0,
    capacidade_sacas: 0,
    tipo: 'armazenamento',
    localizacao: '',
    observacoes: '',
    ativo: true,
  });

  const resetForm = () => {
    setFormData({
      empresa_id: null,
      codigo: '',
      nome: '',
      capacidade_kg: 0,
      capacidade_sacas: 0,
      tipo: 'armazenamento',
      localizacao: '',
      observacoes: '',
      ativo: true,
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
      empresa_id: item.empresa_id,
      codigo: item.codigo || '',
      nome: item.nome,
      capacidade_kg: item.capacidade_kg || 0,
      capacidade_sacas: item.capacidade_sacas || 0,
      tipo: item.tipo || 'armazenamento',
      localizacao: item.localizacao || '',
      observacoes: item.observacoes || '',
      ativo: item.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este silo?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const getTipoBadge = (tipo: string | null) => {
    switch (tipo) {
      case 'armazenamento':
        return <Badge className="bg-emerald-500">Armazenamento</Badge>;
      case 'secagem':
        return <Badge className="bg-amber-500">Secagem</Badge>;
      case 'transbordo':
        return <Badge className="bg-sky-500">Transbordo</Badge>;
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
    <div className="space-y-6">
      <PageHeader
        title="Silos"
        description="Gerencie os silos e armazéns da empresa"
        icon={Warehouse}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-primary" />
            Lista de Silos
          </CardTitle>
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Silo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Editar' : 'Novo'} Silo</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Código</Label>
                      <Input value={formData.codigo || ''} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={formData.tipo || 'armazenamento'} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="armazenamento">Armazenamento</SelectItem>
                          <SelectItem value="secagem">Secagem</SelectItem>
                          <SelectItem value="transbordo">Transbordo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Empresa</Label>
                      <Select value={formData.empresa_id || ''} onValueChange={(value) => setFormData({ ...formData, empresa_id: value || null })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {empresas?.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.razao_social}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Capacidade (Kg)</Label>
                      <Input type="number" step="0.01" value={formData.capacidade_kg || ''} onChange={(e) => setFormData({ ...formData, capacidade_kg: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Capacidade (Sacas)</Label>
                      <Input type="number" step="0.01" value={formData.capacidade_sacas || ''} onChange={(e) => setFormData({ ...formData, capacidade_sacas: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Localização</Label>
                    <Input value={formData.localizacao || ''} onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })} />
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea value={formData.observacoes || ''} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch checked={formData.ativo ?? true} onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })} />
                    <Label>Ativo</Label>
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
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-right">Cap. (Kg)</TableHead>
                <TableHead className="text-right">Cap. (Sacas)</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {silos?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.codigo || '-'}</TableCell>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell>{getTipoBadge(item.tipo)}</TableCell>
                  <TableCell>{item.empresa?.razao_social || '-'}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.capacidade_kg)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.capacidade_sacas)}</TableCell>
                  <TableCell>
                    {item.localizacao || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.ativo ? 'default' : 'secondary'}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
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
              {(!silos || silos.length === 0) && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 9 : 8} className="text-center text-muted-foreground py-8">
                    Nenhum silo cadastrado
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
