import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Send, Eye, Link2 } from 'lucide-react';
import { VincularNfeDialog } from '@/components/nfe/VincularNfeDialog';
import { useDevolucoes, useDeleteDevolucao, type DevolucaoDeposito } from '@/hooks/useDevolucoes';
import { useAllInscricoes } from '@/hooks/useAllInscricoes';
import { useGranjas } from '@/hooks/useGranjas';
import { useSafras } from '@/hooks/useSafras';
import { useProdutos } from '@/hooks/useProdutos';
import { formatNumber, formatKg } from '@/lib/formatters';
import { format } from 'date-fns';
import { DevolucaoDialog } from '@/components/devolucao/DevolucaoDialog';
import { EmitirNfeDevolucaoDialog } from '@/components/devolucao/EmitirNfeDevolucaoDialog';
import { usePaginacao } from "@/hooks/usePaginacao";
import { TablePagination } from "@/components/ui/table-pagination";
import { ComboboxFilter } from '@/components/ui/combobox-filter';

export default function DevolucaoDeposito() {
  const [granjaId, setGranjaId] = useState<string>('');
  const [safraId, setSafraId] = useState<string>('');
  const [produtoId, setProdutoId] = useState<string>('');
  const [produtorId, setProdutorId] = useState<string>('');
  const [dataInicial, setDataInicial] = useState<string>('');
  const [dataFinal, setDataFinal] = useState<string>('');
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [devolucaoSelecionada, setDevolucaoSelecionada] = useState<DevolucaoDeposito | null>(null);
  const [dialogReadOnly, setDialogReadOnly] = useState(false);

  // NFe Dialog state
  const [nfeDialogDevolucao, setNfeDialogDevolucao] = useState<DevolucaoDeposito | null>(null);
  const [vincularDevolucao, setVincularDevolucao] = useState<DevolucaoDeposito | null>(null);

  const { data: granjas } = useGranjas();
  const { data: safras } = useSafras();
  const { data: produtos } = useProdutos();
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
  
  const { data: devolucoes, isLoading } = useDevolucoes({ granjaId, safraId, produtoId, dataInicial: dataInicial || undefined, dataFinal: dataFinal || undefined });
  const deleteDevolucao = useDeleteDevolucao();

  // Filtro local por produtor
  const devolucoesFiltradas = useMemo(() => {
    if (!devolucoes) return [];
    if (!produtorId) return devolucoes;
    return devolucoes.filter(d => d.inscricao_produtor?.produtores?.nome === produtoresUnicos.find(p => p.id === produtorId)?.nome);
  }, [devolucoes, produtorId, produtoresUnicos]);

  const handleNovaDevolucao = () => {
    setDevolucaoSelecionada(null);
    setDialogReadOnly(false);
    setDialogOpen(true);
  };

  const handleEditarDevolucao = (devolucao: DevolucaoDeposito) => {
    setDevolucaoSelecionada(devolucao);
    setDialogReadOnly(false);
    setDialogOpen(true);
  };

  const handleVisualizarDevolucao = (devolucao: DevolucaoDeposito) => {
    setDevolucaoSelecionada(devolucao);
    setDialogReadOnly(true);
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Granja</Label>
                <ComboboxFilter
                  value={granjaId}
                  onValueChange={setGranjaId}
                  options={granjas?.map(g => ({ value: g.id, label: g.razao_social })) || []}
                  searchPlaceholder="Buscar granja..."
                  emptyText="Nenhuma granja encontrada."
                />
              </div>
              <div>
                <Label>Safra</Label>
                <ComboboxFilter
                  value={safraId}
                  onValueChange={setSafraId}
                  options={safras?.map(s => ({ value: s.id, label: s.nome })) || []}
                  searchPlaceholder="Buscar safra..."
                  emptyText="Nenhuma safra encontrada."
                />
              </div>
              <div>
                <Label>Produto</Label>
                <ComboboxFilter
                  value={produtoId}
                  onValueChange={setProdutoId}
                  options={produtos?.map(p => ({ value: p.id, label: p.nome })) || []}
                  searchPlaceholder="Buscar produto..."
                  emptyText="Nenhum produto encontrado."
                />
              </div>
              <div>
                <Label>Produtor</Label>
                <ComboboxFilter
                  value={produtorId}
                  onValueChange={setProdutorId}
                  options={produtoresUnicos.map(p => ({ value: p.id, label: p.nome }))}
                  searchPlaceholder="Buscar produtor..."
                  emptyText="Nenhum produtor encontrado."
                  popoverWidth="w-[350px]"
                />
              </div>
              <div>
                <Label>Data Inicial</Label>
                <input
                  type="date"
                  value={dataInicial}
                  onChange={(e) => setDataInicial(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <Label>Data Final</Label>
                <input
                  type="date"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
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
                    <TableRow><TableCell colSpan={7} className="text-center">Carregando...</TableCell></TableRow>
                  ) : !devolucoes?.length ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma devolução encontrada</TableCell></TableRow>
                  ) : dadosPaginados.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>{format(new Date(d.data_devolucao), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{d.inscricao_produtor?.produtores?.nome}</TableCell>
                      <TableCell className="hidden sm:table-cell">{d.produto?.nome}</TableCell>
                      <TableCell className="text-right">{formatKg(d.quantidade_kg)}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">R$ {formatNumber(d.valor_total || 0, 2)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={d.status === 'nfe_emitida' ? 'default' : 'secondary'}>
                          {d.status === 'nfe_emitida' ? 'NFe Emitida' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="sticky right-0 bg-background">
                        <div className="flex gap-1">
                          {d.importado ? (
                            <Button variant="ghost" size="icon" onClick={() => handleVisualizarDevolucao(d)} title="Visualizar (importado do sistema legado)">
                              <Eye className="h-4 w-4" />
                            </Button>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => setNfeDialogDevolucao(d)} disabled={!!d.nota_fiscal_id}>
                                <Send className="h-4 w-4" />
                              </Button>
                              {!d.nota_fiscal_id && (
                                <Button variant="ghost" size="icon" onClick={() => setVincularDevolucao(d)} title="Vincular NF-e existente">
                                  <Link2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => handleEditarDevolucao(d)} disabled={!!d.nota_fiscal_id}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteDevolucao.mutate(d.id)} disabled={!!d.nota_fiscal_id}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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
          readOnly={dialogReadOnly}
        />

        {/* NFe Dialog */}
        <EmitirNfeDevolucaoDialog
          devolucao={nfeDialogDevolucao}
          onClose={() => setNfeDialogDevolucao(null)}
          onSuccess={() => setNfeDialogDevolucao(null)}
        />

        {vincularDevolucao && (
          <VincularNfeDialog
            open={!!vincularDevolucao}
            onOpenChange={(o) => !o && setVincularDevolucao(null)}
            origem="devolucao_deposito"
            registroId={vincularDevolucao.id}
            granjaId={vincularDevolucao.granja_id}
            cpfCnpjContraparte={vincularDevolucao.inscricao_produtor?.cpf_cnpj}
            valorTotal={Number(vincularDevolucao.valor_total ?? 0)}
            dataOperacao={vincularDevolucao.data_devolucao}
          />
        )}
      </div>
    </AppLayout>
  );
}
