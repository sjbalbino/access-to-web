import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Eye, Trash2, Download, XCircle } from "lucide-react";
import { useNotasFiscais } from "@/hooks/useNotasFiscais";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "rascunho", label: "Rascunho" },
  { value: "processando", label: "Processando" },
  { value: "aprovada", label: "Aprovada" },
  { value: "rejeitada", label: "Rejeitada" },
  { value: "cancelada", label: "Cancelada" },
];

const getStatusBadgeVariant = (status: string | null) => {
  switch (status) {
    case "aprovada":
      return "default";
    case "rascunho":
      return "secondary";
    case "processando":
      return "outline";
    case "rejeitada":
      return "destructive";
    case "cancelada":
      return "destructive";
    default:
      return "outline";
  }
};

const formatCurrency = (value: number | null) => {
  if (!value) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function NotasFiscais() {
  const navigate = useNavigate();
  const { notasFiscais, isLoading, deleteNotaFiscal } = useNotasFiscais();
  const { canEdit } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedNota, setSelectedNota] = useState<string | null>(null);

  const filteredNotas = notasFiscais.filter((nota) => {
    const matchesSearch =
      nota.natureza_operacao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nota.dest_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nota.dest_cpf_cnpj?.includes(searchTerm) ||
      nota.chave_acesso?.includes(searchTerm) ||
      String(nota.numero).includes(searchTerm);
    const matchesStatus = statusFilter === "todos" || nota.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async () => {
    if (selectedNota) {
      await deleteNotaFiscal.mutateAsync(selectedNota);
      setIsDeleteDialogOpen(false);
      setSelectedNota(null);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Notas Fiscais"
          description="Gerenciamento de Notas Fiscais Eletrônicas"
        />

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, destinatário, chave..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canEdit && (
            <Button onClick={() => navigate("/notas-fiscais/nova")}>
              <Plus className="h-4 w-4 mr-2" />
              Nova NF-e
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredNotas.length} nota(s) encontrada(s)
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Número</TableHead>
                <TableHead className="w-20">Série</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Natureza Op.</TableHead>
                <TableHead className="w-32">Data Emissão</TableHead>
                <TableHead className="text-right w-32">Valor Total</TableHead>
                <TableHead className="w-28">Status</TableHead>
                {canEdit && <TableHead className="w-32">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotas.map((nota) => (
                <TableRow key={nota.id}>
                  <TableCell className="font-mono">
                    {nota.numero || "-"}
                  </TableCell>
                  <TableCell className="font-mono">
                    {nota.serie || "-"}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium truncate max-w-[200px]">
                        {nota.dest_nome || "-"}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {nota.dest_cpf_cnpj || "-"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="truncate max-w-[150px]">
                    {nota.natureza_operacao}
                  </TableCell>
                  <TableCell>
                    {nota.data_emissao
                      ? format(new Date(nota.data_emissao), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(nota.total_nota)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(nota.status)}>
                      {STATUS_OPTIONS.find((s) => s.value === nota.status)?.label ||
                        nota.status}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/notas-fiscais/${nota.id}`)}
                          title="Visualizar/Editar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {nota.danfe_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(nota.danfe_url!, "_blank")}
                            title="Download DANFE"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {nota.status === "rascunho" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedNota(nota.id);
                              setIsDeleteDialogOpen(true);
                            }}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        {nota.status === "aprovada" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Cancelar NF-e"
                            disabled
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredNotas.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 8 : 7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhuma nota fiscal encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este rascunho de NF-e? Esta ação não
                pode ser desfeita.
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
      </div>
    </AppLayout>
  );
}
