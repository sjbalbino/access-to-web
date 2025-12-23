import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, Pencil, Trash2 } from "lucide-react";
import { useSafras } from "@/hooks/useSafras";
import { useSilos } from "@/hooks/useSilos";
import { useProdutos } from "@/hooks/useProdutos";
import { useTransferenciasDeposito, useDeleteTransferenciaDeposito, TransferenciaDeposito } from "@/hooks/useTransferenciasDeposito";
import { formatNumber } from "@/lib/formatters";
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

export default function Transferencias() {
  // Filtros para a lista
  const [filtroSafraId, setFiltroSafraId] = useState<string>("");
  const [filtroProdutoId, setFiltroProdutoId] = useState<string>("");
  const [filtroSiloId, setFiltroSiloId] = useState<string>("");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransferencia, setEditingTransferencia] = useState<TransferenciaDeposito | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: safras = [] } = useSafras();
  const { data: silos = [] } = useSilos();
  const { data: produtos = [] } = useProdutos();

  const { data: transferencias = [], isLoading } = useTransferenciasDeposito({
    safraId: filtroSafraId || undefined,
    produtoId: filtroProdutoId || undefined,
    siloId: filtroSiloId || undefined,
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Safra</Label>
                <Select value={filtroSafraId || "__all__"} onValueChange={(val) => setFiltroSafraId(val === "__all__" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as safras" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas</SelectItem>
                    {safras.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Produto/Variedade</Label>
                <Select value={filtroProdutoId || "__all__"} onValueChange={(val) => setFiltroProdutoId(val === "__all__" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os produtos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {produtos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Silo</Label>
                <Select value={filtroSiloId || "__all__"} onValueChange={(val) => setFiltroSiloId(val === "__all__" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os silos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {silos.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Código</TableHead>
                      <TableHead className="w-28">Data</TableHead>
                      <TableHead>Safra</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Origem → Destino</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="w-24 text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transferencias.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Badge variant="outline">#{t.codigo}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(t.data_transferencia).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>{t.safra?.nome || "-"}</TableCell>
                        <TableCell>{t.produto?.nome || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <span className="font-medium">
                              {t.inscricao_origem?.produtores?.nome || t.inscricao_origem?.inscricao_estadual || "-"}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">
                              {t.inscricao_destino?.produtores?.nome || t.inscricao_destino?.inscricao_estadual || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNumber(t.quantidade_kg)} kg
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditarTransferencia(t)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(t.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
