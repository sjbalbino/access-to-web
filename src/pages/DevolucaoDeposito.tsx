import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Send } from 'lucide-react';
import { useDevolucoes, useDeleteDevolucao, type DevolucaoDeposito } from '@/hooks/useDevolucoes';
import { useAllInscricoes } from '@/hooks/useAllInscricoes';
import { useGranjas } from '@/hooks/useGranjas';
import { useSafras } from '@/hooks/useSafras';
import { useProdutosSementes } from '@/hooks/useProdutosSementes';
import { formatNumber, formatKg } from '@/lib/formatters';
import { format } from 'date-fns';
import { DevolucaoDialog } from '@/components/devolucao/DevolucaoDialog';
import { EmitirNfeDevolucaoDialog } from '@/components/devolucao/EmitirNfeDevolucaoDialog';
import { usePaginacao } from "@/hooks/usePaginacao";
import { TablePagination } from "@/components/ui/table-pagination";

export default function DevolucaoDeposito() {
  const [granjaId, setGranjaId] = useState<string>('');
  const [safraId, setSafraId] = useState<string>('');
  const [produtoId, setProdutoId] = useState<string>('');
  const [produtorId, setProdutorId] = useState<string>('');
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [devolucaoSelecionada, setDevolucaoSelecionada] = useState<DevolucaoDeposito | null>(null);
  
  // NFe Dialog state
  const [nfeDialogDevolucao, setNfeDialogDevolucao] = useState<DevolucaoDeposito | null>(null);

  const { data: granjas } = useGranjas();
  const { data: safras } = useSafras();
  const { data: produtos } = useProdutosSementes();
  const { data: allInscricoes } = useAllInscricoes();
  
  const produtoresUnicos = useMemo(() => {
    if (!allInscricoes) return [];
    const map = new Map<string, string>();
    allInscricoes.forEach(i => {
      if (i.produtores?.id && i.produtores?.nome) {
        map.set(i.produtores.id, i.produtores.nome);
      }
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [allInscricoes]);
  
  const { data: devolucoes, isLoading } = useDevolucoes({ granjaId, safraId, produtoId });
  const deleteDevolucao = useDeleteDevolucao();

  // Filtro local por produtor
  const devolucoesFiltradas = useMemo(() => {
    if (!devolucoes) return [];
    if (!produtorId) return devolucoes;
    return devolucoes.filter(d => d.inscricao_produtor?.produtores?.nome === produtoresUnicos.find(p => p.id === produtorId)?.nome);
  }, [devolucoes, produtorId, produtoresUnicos]);

  const handleNovaDevolucao = () => {
    setDevolucaoSelecionada(null);
    setDialogOpen(true);
  };

  const handleEditarDevolucao = (devolucao: DevolucaoDeposito) => {
    setDevolucaoSelecionada(devolucao);
    setDialogOpen(true);
  };

  const {
    dadosPaginados,
    paginaAtual,
    totalPaginas,
    totalRegistros,
    setPaginaAtual,
    gerarNumerosPaginas,
  } = usePaginacao(devolucoesFiltradas);


  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Devolução de Depósito"
          description="CFOP 5949 - Devolução de mercadoria depositada (baixa saldo produtor)"
          actions={
            <Button onClick={handleNovaDevolucao}>
              <Plus className="h-4 w-4 mr-2" /> Nova Devolução
            </Button>
          }
        />

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Granja</Label>
                <Select value={granjaId} onValueChange={setGranjaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {granjas?.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Safra</Label>
                <Select value={safraId} onValueChange={setSafraId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {safras?.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Produto</Label>
                <Select value={produtoId} onValueChange={setProdutoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {produtos?.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Produtor</Label>
                <Select value={produtorId} onValueChange={setProdutorId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {produtoresUnicos.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista */}
        <Card>
          <CardHeader>
            <CardTitle>Devoluções Registradas</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cód</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Produtor</TableHead>
                    <TableHead className="hidden sm:table-cell">Produto</TableHead>
                    <TableHead className="text-right">Qtde (kg)</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Valor</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="sticky right-0 bg-background">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center">Carregando...</TableCell></TableRow>
                  ) : !devolucoes?.length ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhuma devolução encontrada</TableCell></TableRow>
                  ) : dadosPaginados.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>{d.codigo}</TableCell>
                      <TableCell>{format(new Date(d.data_devolucao), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{d.inscricao_produtor?.produtores?.nome}</TableCell>
                      <TableCell className="hidden sm:table-cell">{d.produto?.nome}</TableCell>
                      <TableCell className="text-right">{formatNumber(d.quantidade_kg, 3)}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">R$ {formatNumber(d.valor_total || 0, 2)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={d.status === 'nfe_emitida' ? 'default' : 'secondary'}>
                          {d.status === 'nfe_emitida' ? 'NFe Emitida' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="sticky right-0 bg-background">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setNfeDialogDevolucao(d)} disabled={!!d.nota_fiscal_id}>
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditarDevolucao(d)} disabled={!!d.nota_fiscal_id}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteDevolucao.mutate(d.id)} disabled={!!d.nota_fiscal_id}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="px-4">
              <TablePagination paginaAtual={paginaAtual} totalPaginas={totalPaginas} totalRegistros={totalRegistros} setPaginaAtual={setPaginaAtual} gerarNumerosPaginas={gerarNumerosPaginas} />
            </div>
          </CardContent>
        </Card>

        {/* Dialog */}
        <DevolucaoDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          devolucao={devolucaoSelecionada}
          defaultFiltros={{ granjaId, safraId, produtoId }}
        />

        {/* NFe Dialog */}
        <EmitirNfeDevolucaoDialog
          devolucao={nfeDialogDevolucao}
          onClose={() => setNfeDialogDevolucao(null)}
          onSuccess={() => setNfeDialogDevolucao(null)}
        />
      </div>
    </AppLayout>
  );
}
