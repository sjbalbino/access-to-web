import { useState, useEffect } from 'react';
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
import { Plus, Pencil, Trash2, Droplets, Upload, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { useTabelaUmidades, useCreateTabelaUmidade, useUpdateTabelaUmidade, useDeleteTabelaUmidade, TabelaUmidadeInsert } from '@/hooks/useTabelaUmidades';
import { useCulturas } from '@/hooks/useCulturas';
import { ImportarUmidadesDialog } from '@/components/ImportarUmidadesDialog';

export default function TabelaUmidades() {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const { canEdit } = useAuth();
  const { data: umidades, isLoading } = useTabelaUmidades();
  const { data: culturas } = useCulturas();
  const createMutation = useCreateTabelaUmidade();
  const updateMutation = useUpdateTabelaUmidade();
  const deleteMutation = useDeleteTabelaUmidade();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [filtroCultura, setFiltroCultura] = useState<string>('all');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [formData, setFormData] = useState<TabelaUmidadeInsert>({
    cultura_id: null,
    umidade_minima: 0,
    umidade_maxima: 0,
    desconto_percentual: 0,
    melhoria_ph: 0,
    observacoes: '',
    ativa: true,
  });

  const resetForm = () => {
    setFormData({
      cultura_id: null,
      umidade_minima: 0,
      umidade_maxima: 0,
      desconto_percentual: 0,
      melhoria_ph: 0,
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
      cultura_id: item.cultura_id,
      umidade_minima: item.umidade_minima,
      umidade_maxima: item.umidade_maxima,
      desconto_percentual: item.desconto_percentual || 0,
      melhoria_ph: item.melhoria_ph || 0,
      observacoes: item.observacoes || '',
      ativa: item.ativa,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta faixa de umidade?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  };

  // Filtragem por cultura
  const umidadesFiltradas = umidades?.filter((item: any) => {
    if (filtroCultura === 'all') return true;
    return item.cultura_id === filtroCultura;
  });

  // Paginação
  const totalRegistros = umidadesFiltradas?.length || 0;
  const totalPaginas = Math.ceil(totalRegistros / itensPorPagina);
  const indiceInicio = (paginaAtual - 1) * itensPorPagina;
  const indiceFim = indiceInicio + itensPorPagina;
  const umidadesPaginadas = umidadesFiltradas?.slice(indiceInicio, indiceFim);

  // Reset página ao mudar filtro ou itens por página
  useEffect(() => {
    setPaginaAtual(1);
  }, [filtroCultura, itensPorPagina]);

  // Gerar números de páginas para exibição
  const gerarNumerosPaginas = () => {
    const paginas: (number | 'ellipsis')[] = [];
    if (totalPaginas <= 7) {
      for (let i = 1; i <= totalPaginas; i++) paginas.push(i);
    } else {
      paginas.push(1);
      if (paginaAtual > 3) paginas.push('ellipsis');
      for (let i = Math.max(2, paginaAtual - 1); i <= Math.min(totalPaginas - 1, paginaAtual + 1); i++) {
        paginas.push(i);
      }
      if (paginaAtual < totalPaginas - 2) paginas.push('ellipsis');
      paginas.push(totalPaginas);
    }
    return paginas;
  };

  if (isLoading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <AppLayout>
    <div className="space-y-6">
      <PageHeader
        title="Tabela de Umidades"
        description="Gerencie as faixas de umidade e descontos aplicáveis"
        icon={<Droplets className="h-6 w-6" />}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Faixas de Umidade
          </CardTitle>
          {canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={() => setIsImportDialogOpen(true)}>
                <Upload className="h-4 w-4" />
                Importar Excel
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Faixa
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Editar' : 'Nova'} Faixa de Umidade</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cultura</Label>
                    <Select value={formData.cultura_id || ''} onValueChange={(value) => setFormData({ ...formData, cultura_id: value || null })}>
                      <SelectTrigger><SelectValue placeholder="Todas as culturas" /></SelectTrigger>
                      <SelectContent>
                        {culturas?.filter(c => c.ativa).map((cultura) => (
                          <SelectItem key={cultura.id} value={cultura.id}>{cultura.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Umidade Mínima (%) *</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={formData.umidade_minima} 
                        onChange={(e) => setFormData({ ...formData, umidade_minima: parseFloat(e.target.value) || 0 })} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Umidade Máxima (%) *</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={formData.umidade_maxima} 
                        onChange={(e) => setFormData({ ...formData, umidade_maxima: parseFloat(e.target.value) || 0 })} 
                        required 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Desconto Percentual (%)</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={formData.desconto_percentual || ''} 
                        onChange={(e) => setFormData({ ...formData, desconto_percentual: parseFloat(e.target.value) || 0 })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Melhoria do PH</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={formData.melhoria_ph || ''} 
                        onChange={(e) => setFormData({ ...formData, melhoria_ph: parseFloat(e.target.value) || 0 })} 
                      />
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
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtro por Cultura */}
          <div className="flex items-center gap-3 pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filtrar:</span>
            </div>
            <Select value={filtroCultura} onValueChange={setFiltroCultura}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Todas as culturas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as culturas</SelectItem>
                {culturas?.filter(c => c.ativa).map((cultura) => (
                  <SelectItem key={cultura.id} value={cultura.id}>{cultura.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Exibindo {Math.min(indiceFim, totalRegistros)} de {totalRegistros} registros
              {filtroCultura !== 'all' && ` (filtrado de ${umidades?.length || 0})`}
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cultura</TableHead>
                <TableHead className="text-center">Umidade Mín.</TableHead>
                <TableHead className="text-center">Umidade Máx.</TableHead>
                <TableHead className="text-center">Desconto</TableHead>
                <TableHead className="text-center">Melhoria PH</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {umidadesPaginadas?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.cultura?.nome || 'Todas'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-mono">
                      {formatPercent(item.umidade_minima)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-mono">
                      {formatPercent(item.umidade_maxima)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-amber-500 font-mono">
                      {formatPercent(item.desconto_percentual)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-mono">
                      {item.melhoria_ph?.toFixed(2) || '0.00'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {item.observacoes || '-'}
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
              {(!umidadesPaginadas || umidadesPaginadas.length === 0) && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground py-8">
                    Nenhuma faixa de umidade cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Itens por página:</span>
                <Select value={itensPorPagina.toString()} onValueChange={(value) => setItensPorPagina(parseInt(value))}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                      disabled={paginaAtual === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                  </PaginationItem>

                  {gerarNumerosPaginas().map((pagina, index) => (
                    <PaginationItem key={index}>
                      {pagina === 'ellipsis' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          onClick={() => setPaginaAtual(pagina)}
                          isActive={paginaAtual === pagina}
                          className="cursor-pointer"
                        >
                          {pagina}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                      disabled={paginaAtual === totalPaginas}
                      className="gap-1"
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>

              <span className="text-sm text-muted-foreground">
                Página {paginaAtual} de {totalPaginas}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <ImportarUmidadesDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} />
    </div>
    </AppLayout>
  );
}
