import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Trash2, ExternalLink } from "lucide-react";
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
import { formatNumber } from "@/lib/formatters";
import { NotaDepositoFormDialog } from "@/components/deposito/NotaDepositoFormDialog";

export default function NotasDeposito() {
  const navigate = useNavigate();
  
  // Filtros da listagem
  const [granjaId, setGranjaId] = useState<string>("");
  const [safraId, setSafraId] = useState<string>("");
  const [produtoId, setProdutoId] = useState<string>("");
  
  // Dialog de formulário
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  
  // Exclusão
  const [deleteNotaId, setDeleteNotaId] = useState<string | null>(null);

  const { data: safras = [] } = useSafras();
  const { data: granjas = [] } = useGranjas();
  const { data: produtos = [] } = useProdutos();
  
  // Buscar notas emitidas com filtros
  const { data: notasEmitidas = [], isLoading, refetch } = useNotasDepositoEmitidas({
    safraId: safraId || undefined,
    produtoId: produtoId || undefined,
    granjaId: granjaId || undefined,
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Granja</Label>
                <Select value={granjaId} onValueChange={setGranjaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as granjas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as granjas</SelectItem>
                    {granjas.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nome_fantasia || g.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Safra</Label>
                <Select value={safraId} onValueChange={setSafraId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as safras" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as safras</SelectItem>
                    {safras.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Produto</Label>
                <Select value={produtoId} onValueChange={setProdutoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os produtos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os produtos</SelectItem>
                    {produtosCereais.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  {notasEmitidas.map((nota) => {
                    const nfStatus = nota.nota_fiscal?.status;
                    const canDelete = !nfStatus || nfStatus === 'rascunho';
                    
                    return (
                      <TableRow key={nota.id}>
                        <TableCell>
                          {nota.data_emissao 
                            ? format(new Date(nota.data_emissao), "dd/MM/yyyy")
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
                          {formatNumber(nota.quantidade_kg, 3)} kg
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(nfStatus)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {nota.nota_fiscal_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => navigate(`/notas-fiscais/${nota.nota_fiscal_id}`)}
                                title="Ver nota fiscal"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteNotaId(nota.id)}
                              disabled={!canDelete}
                              title={canDelete ? "Excluir" : "Não é possível excluir nota autorizada"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog do formulário */}
      <NotaDepositoFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
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
