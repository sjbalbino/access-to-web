import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Trash2, ExternalLink, Pencil, Eye, RotateCw } from "lucide-react";
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
import { useSafras } from "@/hooks/useSafras";
import { useGranjas } from "@/hooks/useGranjas";
import { useProdutos } from "@/hooks/useProdutos";
import { useNotasDepositoEmitidas, useDeleteNotaDepositoEmitida } from "@/hooks/useNotasDepositoEmitidas";
import { useAllInscricoes } from "@/hooks/useAllInscricoes";
import { formatNumber, formatKg } from "@/lib/formatters";
import { NotaDepositoFormDialog } from "@/components/deposito/NotaDepositoFormDialog";
import { usePaginacao } from "@/hooks/usePaginacao";
import { TablePagination } from "@/components/ui/table-pagination";
import { ComboboxFilter } from "@/components/ui/combobox-filter";

export default function NotasDeposito() {
  const navigate = useNavigate();
  
  // Filtros da listagem
  const [granjaId, setGranjaId] = useState<string>("");
  const [safraId, setSafraId] = useState<string>("");
  const [produtoId, setProdutoId] = useState<string>("");
  const [inscricaoProdutorId, setInscricaoProdutorId] = useState<string>("");
  
  // Dialog de formulário
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editNotaId, setEditNotaId] = useState<string | null>(null);
  
  // Exclusão
  const [deleteNotaId, setDeleteNotaId] = useState<string | null>(null);

  const { data: safras = [] } = useSafras();
  const { data: granjas = [] } = useGranjas();
  const { data: produtos = [] } = useProdutos();
  const { data: allInscricoes = [] } = useAllInscricoes();
  
  // Opções de produtores para o filtro
  const produtorOptions = useMemo(() => {
    return allInscricoes
      .filter(i => i.ativa !== false)
      .map(i => ({
        value: i.id,
        label: `${i.inscricao_estadual || ''} - ${i.produtores?.nome || i.nome || 'Sem nome'}`,
      }));
  }, [allInscricoes]);
  
  // Buscar notas emitidas com filtros
  const { data: notasEmitidas = [], isLoading, refetch } = useNotasDepositoEmitidas({
    safraId: safraId || undefined,
    produtoId: produtoId || undefined,
    granjaId: granjaId || undefined,
    inscricaoProdutorId: inscricaoProdutorId || undefined,
  });

  const deleteNotaMutation = useDeleteNotaDepositoEmitida();

  const handleDelete = async () => {
    if (!deleteNotaId) return;
    
    try {
      await deleteNotaMutation.mutateAsync(deleteNotaId);
      setDeleteNotaId(null);
    } catch (error) {
      console.error("Erro ao excluir nota:", error);
    }
  };

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case "autorizado":
        return <Badge className="bg-green-500 hover:bg-green-600">Autorizado</Badge>;
      case "rejeitado":
      case "erro_autorizacao":
        return <Badge variant="destructive">Rejeitado</Badge>;
      case "cancelado":
        return <Badge variant="secondary">Cancelado</Badge>;
      case "processando":
        return <Badge variant="outline">Processando</Badge>;
      default:
        return <Badge variant="outline">Rascunho</Badge>;
    }
  };

  // Produtos do tipo cereais para filtro
  const produtosCereais = produtos.filter(p => p.tipo === 'cereal' || p.grupo === 'Cereais');

  const {
    dadosPaginados,
    paginaAtual,
    totalPaginas,
    totalRegistros,
    setPaginaAtual,
    gerarNumerosPaginas,
  } = usePaginacao(notasEmitidas || []);


  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Notas de Depósito"
          description="Consulta e emissão de contra-notas (CFOP 1905) para entrada de mercadoria recebida para depósito"
          icon={<FileText className="h-5 w-5" />}
          actions={
            <Button onClick={() => setFormDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Nota de Depósito
            </Button>
          }
        />

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Produtor</Label>
                <ComboboxFilter
                  value={inscricaoProdutorId}
                  onValueChange={setInscricaoProdutorId}
                  options={produtorOptions}
                  searchPlaceholder="Buscar produtor..."
                  emptyText="Nenhum produtor encontrado."
                />
              </div>
                <Label>Granja</Label>
                <ComboboxFilter
                  value={granjaId}
                  onValueChange={setGranjaId}
                  options={granjas.map(g => ({ value: g.id, label: g.nome_fantasia || g.razao_social }))}
                  searchPlaceholder="Buscar granja..."
                  emptyText="Nenhuma granja encontrada."
                />
              </div>

              <div className="space-y-2">
                <Label>Safra</Label>
                <ComboboxFilter
                  value={safraId}
                  onValueChange={setSafraId}
                  options={safras.map(s => ({ value: s.id, label: s.nome }))}
                  searchPlaceholder="Buscar safra..."
                  emptyText="Nenhuma safra encontrada."
                />
              </div>

              <div className="space-y-2">
                <Label>Produto</Label>
                <ComboboxFilter
                  value={produtoId}
                  onValueChange={setProdutoId}
                  options={produtosCereais.map(p => ({ value: p.id, label: p.nome }))}
                  searchPlaceholder="Buscar produto..."
                  emptyText="Nenhum produto encontrado."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listagem */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas de Depósito Emitidas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando notas...
              </div>
            ) : notasEmitidas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma nota de depósito encontrada
              </div>
            ) : (
              <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>NF Nº</TableHead>
                    <TableHead>Produtor</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosPaginados.map((nota) => {
                    const nfStatus = nota.nota_fiscal?.status || nota.status;
                    const isAutorizado = nfStatus === 'autorizado';
                    const isRascunho = !nfStatus || nfStatus === 'rascunho';
                    const isRejeitado = nfStatus === 'rejeitado' || nfStatus === 'erro_autorizacao';
                    const canEdit = isRascunho || isRejeitado;
                    const canDelete = isRascunho;
                    
                    return (
                      <TableRow key={nota.id}>
                        <TableCell>
                          {nota.data_emissao 
                            ? format(parseISO(nota.data_emissao), "dd/MM/yyyy")
                            : "-"
                          }
                        </TableCell>
                        <TableCell>
                          {nota.nota_fiscal?.numero 
                            ? `${nota.nota_fiscal.numero}/${nota.nota_fiscal.serie || 1}`
                            : "-"
                          }
                        </TableCell>
                        <TableCell>
                          {nota.inscricao_produtor?.produtores?.nome || 
                           nota.inscricao_produtor?.granja || 
                           "-"
                          }
                        </TableCell>
                        <TableCell>{nota.produto?.nome || "-"}</TableCell>
                        <TableCell className="text-right">
                          {formatKg(nota.quantidade_kg)} kg
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(nfStatus)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Visualizar NF-e (autorizada) */}
                            {isAutorizado && nota.nota_fiscal_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => navigate(`/notas-fiscais/${nota.nota_fiscal_id}`)}
                                title="Visualizar nota fiscal"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Editar NF-e (rascunho ou rejeitada com NF-e vinculada) */}
                            {canEdit && nota.nota_fiscal_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => navigate(`/notas-fiscais/${nota.nota_fiscal_id}`)}
                                title="Editar nota fiscal"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Editar registro (rascunho sem NF-e vinculada - importados) */}
                            {canEdit && !nota.nota_fiscal_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditNotaId(nota.id);
                                  setFormDialogOpen(true);
                                }}
                                title="Editar / Emitir NF-e"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Reemitir NF-e (rejeitada) */}
                            {isRejeitado && nota.nota_fiscal_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-600 hover:text-amber-700"
                                onClick={() => navigate(`/notas-fiscais/${nota.nota_fiscal_id}`)}
                                title="Corrigir e reemitir NF-e"
                              >
                                <RotateCw className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Excluir (apenas rascunho) */}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteNotaId(nota.id)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination
                paginaAtual={paginaAtual}
                totalPaginas={totalPaginas}
                totalRegistros={totalRegistros}
                setPaginaAtual={setPaginaAtual}
                gerarNumerosPaginas={gerarNumerosPaginas}
              />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog do formulário */}
      <NotaDepositoFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => {
          setFormDialogOpen(open);
          if (!open) setEditNotaId(null);
        }}
        editNotaId={editNotaId}
        onSuccess={() => refetch()}
      />

      {/* Confirmação de exclusão */}
      <AlertDialog open={deleteNotaId !== null} onOpenChange={() => setDeleteNotaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nota de depósito?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro da nota de depósito será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
