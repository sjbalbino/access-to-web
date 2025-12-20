import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Truck, Trash2, FileText } from "lucide-react";
import { useContratosVenda, useDeleteContratoVenda } from "@/hooks/useContratosVenda";
import { useSafras } from "@/hooks/useSafras";
import { useClientesFornecedores } from "@/hooks/useClientesFornecedores";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Spinner } from "@/components/ui/spinner";

export default function VendasProducao() {
  const navigate = useNavigate();
  const [filtroSafra, setFiltroSafra] = useState<string>("");
  const [filtroComprador, setFiltroComprador] = useState<string>("");
  const [filtroNumero, setFiltroNumero] = useState<string>("");
  const [contratoExcluir, setContratoExcluir] = useState<string | null>(null);

  const { data: safras } = useSafras();
  const { data: clientes } = useClientesFornecedores();
  const { data: contratos, isLoading } = useContratosVenda({
    safra_id: filtroSafra || undefined,
    comprador_id: filtroComprador || undefined,
    numero: filtroNumero ? parseInt(filtroNumero) : undefined,
  });
  const deleteContrato = useDeleteContratoVenda();

  const compradores = clientes?.filter(c => c.tipo === "cliente" || c.tipo === "ambos") || [];

  // Totalizadores
  const totalVendido = contratos?.reduce((acc, c) => acc + (Number(c.quantidade_kg) || 0), 0) || 0;
  const totalCarregado = contratos?.reduce((acc, c) => acc + (c.total_carregado_kg || 0), 0) || 0;
  const totalSaldo = contratos?.reduce((acc, c) => acc + (c.saldo_kg || 0), 0) || 0;

  const handleExcluir = async () => {
    if (contratoExcluir) {
      await deleteContrato.mutateAsync(contratoExcluir);
      setContratoExcluir(null);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Vendas da Produção</h1>
            <p className="text-muted-foreground">
              Contratos de venda e remessas de produção agrícola
            </p>
          </div>
          <Button onClick={() => navigate("/vendas-producao/nova")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Contrato
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Safra</Label>
                <Select value={filtroSafra} onValueChange={setFiltroSafra}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {safras?.map((safra) => (
                      <SelectItem key={safra.id} value={safra.id}>
                        {safra.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Comprador</Label>
                <Select value={filtroComprador} onValueChange={setFiltroComprador}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {compradores?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nº Contrato</Label>
                <Input
                  type="number"
                  value={filtroNumero}
                  onChange={(e) => setFiltroNumero(e.target.value)}
                  placeholder="Número"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFiltroSafra("");
                    setFiltroComprador("");
                    setFiltroNumero("");
                  }}
                >
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Nº</TableHead>
                      <TableHead>Comprador</TableHead>
                      <TableHead>Safra</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead className="text-right">Vendido (kg)</TableHead>
                      <TableHead className="text-right">Carregado (kg)</TableHead>
                      <TableHead className="text-right">Saldo (kg)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contratos?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          Nenhum contrato encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      contratos?.map((contrato) => (
                        <TableRow key={contrato.id}>
                          <TableCell className="font-medium">{contrato.numero}</TableCell>
                          <TableCell>{contrato.comprador?.nome || "-"}</TableCell>
                          <TableCell>{contrato.safra?.nome || "-"}</TableCell>
                          <TableCell>
                            {contrato.data_contrato
                              ? format(new Date(contrato.data_contrato), "dd/MM/yyyy", { locale: ptBR })
                              : "-"}
                          </TableCell>
                          <TableCell>{contrato.numero_contrato_comprador || "-"}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatNumber(contrato.quantidade_kg)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(contrato.total_carregado_kg)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={contrato.saldo_kg && contrato.saldo_kg < 0 ? "text-destructive" : ""}>
                              {formatNumber(contrato.saldo_kg)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {contrato.fechada ? (
                              <Badge variant="secondary">Fechada</Badge>
                            ) : contrato.saldo_kg && contrato.saldo_kg <= 0 ? (
                              <Badge variant="default" className="bg-success text-success-foreground">Completo</Badge>
                            ) : (
                              <Badge variant="outline">Em Aberto</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/vendas-producao/${contrato.id}`)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/vendas-producao/${contrato.id}/remessas`)}
                                title="Remessas"
                              >
                                <Truck className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setContratoExcluir(contrato.id)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totalizadores */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Vendido</p>
                <p className="text-2xl font-bold text-primary">{formatNumber(totalVendido)} kg</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Carregado</p>
                <p className="text-2xl font-bold text-success">{formatNumber(totalCarregado)} kg</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Saldo a Carregar</p>
                <p className="text-2xl font-bold text-warning">{formatNumber(totalSaldo)} kg</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de Confirmação */}
      <AlertDialog open={!!contratoExcluir} onOpenChange={() => setContratoExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contrato? Todas as remessas vinculadas também
              serão excluídas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
