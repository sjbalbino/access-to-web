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
import { Plus, Pencil, Trash2, Package, DollarSign } from 'lucide-react';
import { useProdutos, useCreateProduto, useUpdateProduto, useDeleteProduto, ProdutoInsert } from '@/hooks/useProdutos';
import { useUnidadesMedida } from '@/hooks/useUnidadesMedida';
import { useClientesFornecedores } from '@/hooks/useClientesFornecedores';

export default function Produtos() {
  const { canEdit } = useAuth();
  const { data: produtos, isLoading } = useProdutos();
  const { data: unidades } = useUnidadesMedida();
  const { data: fornecedores } = useClientesFornecedores();
  const createMutation = useCreateProduto();
  const updateMutation = useUpdateProduto();
  const deleteMutation = useDeleteProduto();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<ProdutoInsert>({
    empresa_id: null,
    tipo: 'insumo',
    codigo: '',
    nome: '',
    descricao: '',
    unidade_medida_id: null,
    estoque_minimo: 0,
    estoque_atual: 0,
    preco_custo: 0,
    preco_venda: 0,
    fornecedor_id: null,
    ativo: true,
  });

  const resetForm = () => {
    setFormData({
      empresa_id: null,
      tipo: 'insumo',
      codigo: '',
      nome: '',
      descricao: '',
      unidade_medida_id: null,
      estoque_minimo: 0,
      estoque_atual: 0,
      preco_custo: 0,
      preco_venda: 0,
      fornecedor_id: null,
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
      tipo: item.tipo,
      codigo: item.codigo || '',
      nome: item.nome,
      descricao: item.descricao || '',
      unidade_medida_id: item.unidade_medida_id,
      estoque_minimo: item.estoque_minimo || 0,
      estoque_atual: item.estoque_atual || 0,
      preco_custo: item.preco_custo || 0,
      preco_venda: item.preco_venda || 0,
      fornecedor_id: item.fornecedor_id,
      ativo: item.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'insumo':
        return <Badge className="bg-amber-500">Insumo</Badge>;
      case 'produto':
        return <Badge className="bg-emerald-500">Produto</Badge>;
      case 'semente':
        return <Badge className="bg-sky-500">Semente</Badge>;
      default:
        return <Badge>{tipo}</Badge>;
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const fornecedoresFiltrados = fornecedores?.filter(f => f.tipo === 'fornecedor' || f.tipo === 'ambos');

  if (isLoading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos / Insumos"
        description="Gerencie os produtos e insumos utilizados nas operações"
        icon={<Package className="h-6 w-6" />}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Lista de Produtos
          </CardTitle>
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Editar' : 'Novo'} Produto</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo *</Label>
                      <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="insumo">Insumo</SelectItem>
                          <SelectItem value="produto">Produto</SelectItem>
                          <SelectItem value="semente">Semente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Código</Label>
                      <Input value={formData.codigo || ''} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Unidade de Medida</Label>
                      <Select value={formData.unidade_medida_id || ''} onValueChange={(value) => setFormData({ ...formData, unidade_medida_id: value || null })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {unidades?.filter(u => u.ativa).map((und) => (
                            <SelectItem key={und.id} value={und.id}>{und.codigo} - {und.descricao}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea value={formData.descricao || ''} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
                  </div>

                  <div className="space-y-2">
                    <Label>Fornecedor Principal</Label>
                    <Select value={formData.fornecedor_id || ''} onValueChange={(value) => setFormData({ ...formData, fornecedor_id: value || null })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {fornecedoresFiltrados?.map((forn) => (
                          <SelectItem key={forn.id} value={forn.id}>{forn.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Estoque Mínimo</Label>
                      <Input type="number" step="0.01" value={formData.estoque_minimo || ''} onChange={(e) => setFormData({ ...formData, estoque_minimo: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Estoque Atual</Label>
                      <Input type="number" step="0.01" value={formData.estoque_atual || ''} onChange={(e) => setFormData({ ...formData, estoque_atual: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Preço Custo (R$)</Label>
                      <Input type="number" step="0.01" value={formData.preco_custo || ''} onChange={(e) => setFormData({ ...formData, preco_custo: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Preço Venda (R$)</Label>
                      <Input type="number" step="0.01" value={formData.preco_venda || ''} onChange={(e) => setFormData({ ...formData, preco_venda: parseFloat(e.target.value) || 0 })} />
                    </div>
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
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Preço Venda</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.codigo || '-'}</TableCell>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell>{getTipoBadge(item.tipo)}</TableCell>
                  <TableCell>{item.unidade_medida?.sigla || item.unidade_medida?.codigo || '-'}</TableCell>
                  <TableCell className="text-right">{item.estoque_atual?.toLocaleString('pt-BR') || '0'}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.preco_venda)}
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
              {(!produtos || produtos.length === 0) && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground py-8">
                    Nenhum produto cadastrado
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
