import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, GitBranch, ChevronDown, ChevronRight } from 'lucide-react';
import { useDreContas, useCreateDreConta, useUpdateDreConta, useDeleteDreConta, DreContaInput, DreConta } from '@/hooks/useDreContas';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function DreEstrutura() {
  const { canEdit } = useAuth();
  const { data: contas, isLoading } = useDreContas();
  const createMutation = useCreateDreConta();
  const updateMutation = useUpdateDreConta();
  const deleteMutation = useDeleteDreConta();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DreConta | null>(null);
  const [formData, setFormData] = useState<DreContaInput>({
    codigo: '', descricao: '', nivel: 1, parent_id: null, tipo_saldo: 'debito', ordem: 0, ativo: true,
  });
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const resetForm = () => {
    setFormData({ codigo: '', descricao: '', nivel: 1, parent_id: null, tipo_saldo: 'debito', ordem: 0, ativo: true });
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) await updateMutation.mutateAsync({ id: editingItem.id, ...formData });
    else await createMutation.mutateAsync(formData);
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (item: DreConta) => {
    setEditingItem(item);
    setFormData({
      codigo: item.codigo, descricao: item.descricao, nivel: item.nivel,
      parent_id: item.parent_id, tipo_saldo: item.tipo_saldo || 'debito',
      ordem: item.ordem || 0, ativo: item.ativo ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conta DRE?')) await deleteMutation.mutateAsync(id);
  };

  const openNewChild = (parentId: string | null, parentNivel: number) => {
    resetForm();
    setFormData(prev => ({ ...prev, parent_id: parentId, nivel: parentNivel + 1 }));
    setIsDialogOpen(true);
  };

  const toggleNode = (id: string) => setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));

  // Build tree
  const rootContas = contas?.filter(c => !c.parent_id) || [];
  const getChildren = (parentId: string) => contas?.filter(c => c.parent_id === parentId) || [];

  const renderNode = (conta: DreConta, depth: number = 0) => {
    const children = getChildren(conta.id);
    const isExpanded = expandedNodes[conta.id];
    const hasChildren = children.length > 0;

    return (
      <div key={conta.id}>
        <div className={cn('flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 border-b')} style={{ paddingLeft: `${16 + depth * 24}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button onClick={() => toggleNode(conta.id)} className="p-0.5">
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>
            ) : <div className="w-5" />}
            <span className="font-mono text-sm font-medium text-primary">{conta.codigo}</span>
            <span className={cn('font-medium', depth === 0 && 'text-base')}>{conta.descricao}</span>
            <span className={cn('px-2 py-0.5 rounded-full text-xs', conta.tipo_saldo === 'credito' ? 'bg-success/10 text-success' : 'bg-info/10 text-info')}>
              {conta.tipo_saldo === 'credito' ? 'Crédito' : 'Débito'}
            </span>
            {!conta.ativo && <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">Inativo</span>}
          </div>
          {canEdit && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => openNewChild(conta.id, conta.nivel)} title="Adicionar filho"><Plus className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleEdit(conta)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(conta.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          )}
        </div>
        {isExpanded && children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  const parentOptions = contas?.filter(c => !editingItem || c.id !== editingItem.id) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader title="Estrutura do DRE" description="Cadastro hierárquico do Demonstrativo de Resultado do Exercício" icon={<GitBranch className="h-6 w-6" />} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5 text-primary" />Contas do DRE</CardTitle>
            {canEdit && (
              <Button className="gap-2" onClick={() => { resetForm(); setIsDialogOpen(true); }}><Plus className="h-4 w-4" />Nova Conta Raiz</Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : rootContas.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                {rootContas.map(c => renderNode(c))}
              </div>
            ) : (
              <div className="text-center py-12">
                <GitBranch className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma conta DRE cadastrada</h3>
                <p className="text-muted-foreground mb-4">Comece criando a estrutura hierárquica do DRE</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? 'Editar' : 'Nova'} Conta DRE</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Código *</Label><Input value={formData.codigo} onChange={e => setFormData({ ...formData, codigo: e.target.value })} required placeholder="Ex: 01, 01.01, 01.01.001" /></div>
            <div className="space-y-2"><Label>Descrição *</Label><Input value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nível</Label>
                <Input type="number" min={1} value={formData.nivel} onChange={e => setFormData({ ...formData, nivel: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input type="number" value={formData.ordem || 0} onChange={e => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Conta Pai</Label>
              <Select value={formData.parent_id || 'none'} onValueChange={v => setFormData({ ...formData, parent_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Nenhuma (raiz)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                  {parentOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.descricao}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Saldo</Label>
              <Select value={formData.tipo_saldo || 'debito'} onValueChange={v => setFormData({ ...formData, tipo_saldo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="debito">Débito</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2"><Switch checked={formData.ativo ?? true} onCheckedChange={checked => setFormData({ ...formData, ativo: checked })} /><Label>Ativo</Label></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{editingItem ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
