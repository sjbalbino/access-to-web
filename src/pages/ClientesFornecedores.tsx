import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClienteFornecedorDialog } from '@/components/clientes-fornecedores/ClienteFornecedorDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Users, Building, Phone, Mail, Loader2, Sparkles } from 'lucide-react';
import { useClientesFornecedores, useDeleteClienteFornecedor, ClienteFornecedor } from '@/hooks/useClientesFornecedores';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { confirmarExclusao } from '@/components/ui/confirm-dialog-provider';

export default function ClientesFornecedores() {
  const { canEdit } = useAuth();
  const { data: clientesFornecedores, isLoading } = useClientesFornecedores();
  const deleteMutation = useDeleteClienteFornecedor();

  const [filtroNome, setFiltroNome] = useState('');
  const [filtroCpfCnpj, setFiltroCpfCnpj] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroCidade, setFiltroCidade] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('ativo');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 20;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClienteFornecedor | null>(null);
  const [enriquecendo, setEnriquecendo] = useState(false);
  const [resultadoEnriquecimento, setResultadoEnriquecimento] = useState<any>(null);
  const queryClient = useQueryClient();

  const handleEnriquecer = async (dryRun: boolean) => {
    const semCidade = (clientesFornecedores || []).filter(c => !c.cidade || c.cidade === '').length;
    const msg = dryRun
      ? `Simular enriquecimento de ${semCidade} registro(s) sem cidade? Nada será gravado.`
      : `Enriquecer ${semCidade} registro(s) sem cidade via CEP/CNPJ? Isso pode levar alguns minutos.`;
    // Ação não destrutiva: reaproveita o diálogo, mas com rótulos neutros.
    const ok = await confirmarExclusao({
      title: 'Confirmar Ação',
      description: msg,
      confirmText: 'Continuar',
    });
    if (!ok) return;
    setEnriquecendo(true);
    setResultadoEnriquecimento(null);
    try {
      const { data, error } = await supabase.functions.invoke('enriquecer-clientes-fornecedores', {
        body: { dry_run: dryRun },
      });
      if (error) throw error;
      setResultadoEnriquecimento(data);
      const s = data?.stats || {};
      toast.success(
        `${dryRun ? 'Simulação' : 'Enriquecimento'} concluído: ${s.atualizados || 0} atualizado(s) (CEP: ${s.via_cep || 0}, CNPJ: ${s.via_cnpj || 0})`
      );
      if (!dryRun) {
        queryClient.invalidateQueries({ queryKey: ['clientes_fornecedores'] });
      }
    } catch (e: any) {
      toast.error('Erro: ' + (e.message || e));
    } finally {
      setEnriquecendo(false);
    }
  };


  const dadosFiltrados = useMemo(() => {
    let dados = clientesFornecedores || [];
    if (filtroNome) {
      const termo = filtroNome.toLowerCase();
      dados = dados.filter(i => i.nome?.toLowerCase().includes(termo) || i.nome_fantasia?.toLowerCase().includes(termo));
    }
    if (filtroCpfCnpj) {
      const termo = filtroCpfCnpj.replace(/\D/g, '');
      dados = dados.filter(i => i.cpf_cnpj?.replace(/\D/g, '').includes(termo));
    }
    if (filtroTipo !== 'todos') {
      dados = dados.filter(i => i.tipo === filtroTipo);
    }
    if (filtroCidade) {
      const termo = filtroCidade.toLowerCase();
      dados = dados.filter(i => i.cidade?.toLowerCase().includes(termo));
    }
    if (filtroAtivo !== 'todos') {
      dados = dados.filter(i => filtroAtivo === 'ativo' ? i.ativo : !i.ativo);
    }
    return dados;
  }, [clientesFornecedores, filtroNome, filtroCpfCnpj, filtroTipo, filtroCidade, filtroAtivo]);

  const totalPaginas = Math.max(1, Math.ceil(dadosFiltrados.length / itensPorPagina));
  const dadosPaginados = dadosFiltrados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);
  const handleEdit = (item: ClienteFornecedor) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (await confirmarExclusao('Tem certeza que deseja excluir este registro?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'cliente':
        return <Badge className="bg-sky-500">Cliente</Badge>;
      case 'fornecedor':
        return <Badge className="bg-amber-500">Fornecedor</Badge>;
      default:
        return <Badge className="bg-emerald-500">Ambos</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <AppLayout>
    <div className="space-y-6">
      <PageHeader
        title="Clientes / Fornecedores"
        description="Gerencie os clientes e fornecedores da empresa"
        icon={<Users className="h-6 w-6" />}
      />

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Lista de Clientes/Fornecedores
          </CardTitle>
          {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" disabled={enriquecendo} onClick={() => handleEnriquecer(true)}>
              {enriquecendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="hidden sm:inline">Simular CEP/CNPJ</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2" disabled={enriquecendo} onClick={() => handleEnriquecer(false)}>
              {enriquecendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="hidden sm:inline">Enriquecer endereços</span>
            </Button>
          </div>
          )}
          {canEdit && (
            <>
              <Button className="gap-2" size="sm" onClick={() => { setEditingItem(null); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4" /><span className="hidden sm:inline">Novo Registro</span>
              </Button>
              <ClienteFornecedorDialog open={isDialogOpen} registroId={editingItem?.id}
                onOpenChange={open => { setIsDialogOpen(open); if (!open) setEditingItem(null); }} />
            </>
          )}
        </CardHeader>
        <CardContent className="min-w-0 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome / Razão Social</Label>
              <Input placeholder="Buscar..." value={filtroNome} onChange={e => { setFiltroNome(e.target.value); setPaginaAtual(1); }} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CPF/CNPJ</Label>
              <Input placeholder="Buscar..." value={filtroCpfCnpj} onChange={e => { setFiltroCpfCnpj(e.target.value); setPaginaAtual(1); }} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select isSearchable value={filtroTipo} onValueChange={v => { setFiltroTipo(v); setPaginaAtual(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cidade</Label>
              <Input placeholder="Buscar..." value={filtroCidade} onChange={e => { setFiltroCidade(e.target.value); setPaginaAtual(1); }} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select isSearchable value={filtroAtivo} onValueChange={v => { setFiltroAtivo(v); setPaginaAtual(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="hidden sm:table-cell">CPF/CNPJ</TableHead>
                <TableHead className="hidden md:table-cell">Cidade/UF</TableHead>
                <TableHead className="hidden md:table-cell">Contato</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                {canEdit && <TableHead className="text-right sticky right-0 bg-background">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dadosPaginados.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.nome}
                    {item.nome_fantasia && item.nome_fantasia.toLowerCase() !== item.nome.toLowerCase() && (
                      <span className="text-muted-foreground text-xs ml-1">({item.nome_fantasia})</span>
                    )}
                  </TableCell>
                  <TableCell>{getTipoBadge(item.tipo)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{item.cpf_cnpj || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">{item.cidade ? `${item.cidade}/${item.uf}` : '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col gap-1 text-sm">
                      {item.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {item.telefone}</span>}
                      {item.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {item.email}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={item.ativo ? 'default' : 'secondary'}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right sticky right-0 bg-background">
                      <div className="flex justify-end gap-1">
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
              {dadosPaginados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-8">
                    {dadosFiltrados.length === 0 && (clientesFornecedores?.length || 0) > 0
                      ? 'Nenhum registro encontrado com os filtros aplicados'
                      : 'Nenhum cliente/fornecedor cadastrado'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-muted-foreground">
                {dadosFiltrados.length} registro(s) — Página {paginaAtual} de {totalPaginas}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={paginaAtual <= 1} onClick={() => setPaginaAtual(1)}>Primeira</Button>
                <Button variant="outline" size="sm" disabled={paginaAtual <= 1} onClick={() => setPaginaAtual(p => p - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaAtual(p => p + 1)}>Próxima</Button>
                <Button variant="outline" size="sm" disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaAtual(totalPaginas)}>Última</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AppLayout>
  );
}
