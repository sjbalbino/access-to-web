import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, Pencil, Trash2 } from "lucide-react";
import { useSafras } from "@/hooks/useSafras";
import { useSilos } from "@/hooks/useSilos";
import { useProdutos } from "@/hooks/useProdutos";
import { useTransferenciasDeposito, useDeleteTransferenciaDeposito, TransferenciaDeposito } from "@/hooks/useTransferenciasDeposito";
import { useAllInscricoes } from "@/hooks/useAllInscricoes";
import { formatNumber, formatKg } from "@/lib/formatters";
import { TransferenciaDialog } from "@/components/transferencias/TransferenciaDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePaginacao } from "@/hooks/usePaginacao";
import { TablePagination } from "@/components/ui/table-pagination";
import { ComboboxFilter } from "@/components/ui/combobox-filter";

export default function Transferencias() {
  // Filtros para a lista
  const [filtroSafraId, setFiltroSafraId] = useState<string>("");
  const [filtroProdutoId, setFiltroProdutoId] = useState<string>("");
  const [filtroSiloId, setFiltroSiloId] = useState<string>("");
  const [filtroOrigemId, setFiltroOrigemId] = useState<string>("");
  const [filtroDestinoId, setFiltroDestinoId] = useState<string>("");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransferencia, setEditingTransferencia] = useState<TransferenciaDeposito | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: safras = [] } = useSafras();
  const { data: silos = [] } = useSilos();
  const { data: produtos = [] } = useProdutos();
  const { data: allInscricoes = [] } = useAllInscricoes();

  const produtorOptions = useMemo(() => {
    return allInscricoes
      .filter(i => i.ativa !== false)
      .map(i => ({
        value: i.id,
        label: `${i.inscricao_estadual || ''} - ${i.produtores?.nome || i.nome || 'Sem nome'}`,
      }));
  }, [allInscricoes]);

  const { data: transferencias = [], isLoading } = useTransferenciasDeposito({
    safraId: filtroSafraId || undefined,
    produtoId: filtroProdutoId || undefined,
    siloId: filtroSiloId || undefined,
    inscricaoOrigemId: filtroOrigemId || undefined,
    inscricaoDestinoId: filtroDestinoId || undefined,
  });

  const deleteTransferencia = useDeleteTransferenciaDeposito();

  const handleNovaTransferencia = () => {
    setEditingTransferencia(null);
    setDialogOpen(true);
  };

  const handleEditarTransferencia = (t: TransferenciaDeposito) => {
    setEditingTransferencia(t);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTransferencia.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const {
    dadosPaginados,
    paginaAtual,
    totalPaginas,
    totalRegistros,
    setPaginaAtual,
    gerarNumerosPaginas,
  } = usePaginacao(transferencias || []);


  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Transferências de Depósito"
          description="Registrar transferências de saldo entre produtores/inscrições"
          actions={
            <Button onClick={handleNovaTransferencia}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Transferência
            </Button>
          }
        />

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Produtor Origem</Label>
                <ComboboxFilter
                  value={filtroOrigemId}
                  onValueChange={setFiltroOrigemId}
                  options={produtorOptions}
                  searchPlaceholder="Buscar produtor..."
                  emptyText="Nenhum produtor encontrado."
                />
              </div>

              <div className="space-y-2">
                <Label>Produtor Destino</Label>
                <ComboboxFilter
                  value={filtroDestinoId}
                  onValueChange={setFiltroDestinoId}
                  options={produtorOptions}
                  searchPlaceholder="Buscar produtor..."
                  emptyText="Nenhum produtor encontrado."
                />
              </div>

              <div className="space-y-2">
                <Label>Safra</Label>
                <ComboboxFilter
                  value={filtroSafraId}
                  onValueChange={setFiltroSafraId}
                  options={safras.map(s => ({ value: s.id, label: s.nome }))}
                  searchPlaceholder="Buscar safra..."
                  emptyText="Nenhuma safra encontrada."
                />
              </div>

              <div className="space-y-2">
                <Label>Produto/Variedade</Label>
                <ComboboxFilter
                  value={filtroProdutoId}
                  onValueChange={setFiltroProdutoId}
                  options={produtos.map(p => ({ value: p.id, label: p.nome }))}
                  searchPlaceholder="Buscar produto..."
                  emptyText="Nenhum produto encontrado."
                />
              </div>

              <div className="space-y-2">
                <Label>Silo</Label>
                <ComboboxFilter
                  value={filtroSiloId}
                  onValueChange={setFiltroSiloId}
                  options={silos.map(s => ({ value: s.id, label: s.nome }))}
                  searchPlaceholder="Buscar silo..."
                  emptyText="Nenhum silo encontrado."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Transferências */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transferências Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : transferencias.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma transferência encontrada
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Código</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="hidden sm:table-cell">Safra</TableHead>
                      <TableHead className="hidden sm:table-cell">Produto</TableHead>
                      <TableHead className="hidden md:table-cell">Origem → Destino</TableHead>
                      <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="w-24 text-center sticky right-0 bg-background">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dadosPaginados.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Badge variant="outline">#{t.codigo}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(t.data_transferencia).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{t.safra?.nome || "-"}</TableCell>
                        <TableCell className="hidden sm:table-cell">{t.produto?.nome || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1 text-sm">
                            <span className="font-medium">{t.inscricao_origem?.produtores?.nome || t.inscricao_origem?.inscricao_estadual || "-"}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{t.inscricao_destino?.produtores?.nome || t.inscricao_destino?.inscricao_estadual || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {t.tipo === 'industria' ? 'Indústria' : t.tipo === 'semente' ? 'Semente' : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatKg(t.quantidade_kg)} kg</TableCell>
                        <TableCell className="sticky right-0 bg-background">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditarTransferencia(t)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(t.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            <TablePagination
              paginaAtual={paginaAtual}
              totalPaginas={totalPaginas}
              totalRegistros={totalRegistros}
              setPaginaAtual={setPaginaAtual}
              gerarNumerosPaginas={gerarNumerosPaginas}
            />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Nova/Editar Transferência */}
      <TransferenciaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transferencia={editingTransferencia}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transferência?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A transferência será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
