import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, FolderOpen, Search, Check } from 'lucide-react';
import { useGruposProdutos, useCreateGrupoProduto, useUpdateGrupoProduto, useDeleteGrupoProduto, GrupoProdutoInput } from '@/hooks/useGruposProdutos';
import { usePlanoContasGerencial } from '@/hooks/usePlanoContasGerencial';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function GruposProdutos() {
  const { canEdit } = useAuth();
  const { data: grupos, isLoading } = useGruposProdutos();
  const { data: contasGerenciais } = usePlanoContasGerencial();
  const createMutation = useCreateGrupoProduto();
  const updateMutation = useUpdateGrupoProduto();
  const deleteMutation = useDeleteGrupoProduto();

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<GrupoProdutoInput>({
    nome: '',
    descricao: '',
    ativo: true,
    conta_gerencial_id: null,
    maquinas_implementos: false,
    bens_benfeitorias: false,
    insumos: false,
    venda_producao: false,
  });

  const filteredGrupos = grupos?.filter(g => 
    g.nome.toLowerCase().includes(search.toLowerCase()) ||
    g.descricao?.toLowerCase().includes(search.toLowerCase())
  );

  const contasAtivas = contasGerenciais?.filter(c => c.ativo) ?? [];

  const resetForm = () => {
    setFormData({ nome: '', descricao: '', ativo: true, conta_gerencial_id: null, maquinas_implementos: false, bens_benfeitorias: false, insumos: false, venda_producao: false });
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
      nome: item.nome,
      descricao: item.descricao || '',
      ativo: item.ativo ?? true,
      conta_gerencial_id: item.conta_gerencial_id || null,
      maquinas_implementos: item.maquinas_implementos ?? false,
      bens_benfeitorias: item.bens_benfeitorias ?? false,
      insumos: item.insumos ?? false,
      venda_producao: item.venda_producao ?? false,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este grupo?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Grupos de Produtos"
          description="Gerencie os grupos e categorias de produtos"
          icon={<FolderOpen className="h-6 w-6" />}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Lista de Grupos
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar grupo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {canEdit && (
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Novo Grupo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editingItem ? 'Editar' : 'Novo'} Grupo</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nome *</Label>
                        <Input
                          value={formData.nome}
                          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea
                          value={formData.descricao || ''}
                          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Conta Gerencial</Label>
                        <Select
                          value={formData.conta_gerencial_id || 'none'}
                          onValueChange={(value) => setFormData({ ...formData, conta_gerencial_id: value === 'none' ? null : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma conta gerencial" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma</SelectItem>
                            {contasAtivas.map((conta) => (
                              <SelectItem key={conta.id} value={conta.id}>
                                {conta.codigo} - {conta.descricao}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3 rounded-lg border p-4">
                        <Label className="text-sm font-semibold">Classificação</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="maquinas"
                              checked={formData.maquinas_implementos ?? false}
                              onCheckedChange={(checked) => setFormData({ ...formData, maquinas_implementos: !!checked })}
                            />
                            <Label htmlFor="maquinas" className="text-sm font-normal cursor-pointer">
                              Máquinas, Impl. e Veículos
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="bens"
                              checked={formData.bens_benfeitorias ?? false}
                              onCheckedChange={(checked) => setFormData({ ...formData, bens_benfeitorias: !!checked })}
                            />
                            <Label htmlFor="bens" className="text-sm font-normal cursor-pointer">
                              Bens e Benfeitorias
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="insumos"
                              checked={formData.insumos ?? false}
                              onCheckedChange={(checked) => setFormData({ ...formData, insumos: !!checked })}
                            />
                            <Label htmlFor="insumos" className="text-sm font-normal cursor-pointer">
                              Insumos
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="venda"
                              checked={formData.venda_producao ?? false}
                              onCheckedChange={(checked) => setFormData({ ...formData, venda_producao: !!checked })}
                            />
                            <Label htmlFor="venda" className="text-sm font-normal cursor-pointer">
                              Venda da Produção
                            </Label>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.ativo ?? true}
                          onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                        />
                        <Label>Ativo</Label>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                          {editingItem ? 'Salvar' : 'Criar'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredGrupos && filteredGrupos.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Conta Gerencial</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Status</TableHead>
                    {canEdit && <TableHead className="w-24">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGrupos.map((grupo) => (
                    <TableRow key={grupo.id}>
                      <TableCell className="font-medium">{grupo.nome}</TableCell>
                      <TableCell>{grupo.descricao || '-'}</TableCell>
                      <TableCell>
                        {grupo.plano_contas_gerencial
                          ? `${grupo.plano_contas_gerencial.codigo} - ${grupo.plano_contas_gerencial.descricao}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {grupo.maquinas_implementos && <Badge variant="outline" className="text-xs">Máquinas</Badge>}
                          {grupo.bens_benfeitorias && <Badge variant="outline" className="text-xs">Bens</Badge>}
                          {grupo.insumos && <Badge variant="outline" className="text-xs">Insumos</Badge>}
                          {grupo.venda_producao && <Badge variant="outline" className="text-xs">Venda</Badge>}
                          {!grupo.maquinas_implementos && !grupo.bens_benfeitorias && !grupo.insumos && !grupo.venda_producao && '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          grupo.ativo ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                        }`}>
                          {grupo.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(grupo)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(grupo.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum grupo encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {search ? 'Tente ajustar sua busca' : 'Comece cadastrando um grupo'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
