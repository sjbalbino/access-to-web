import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Trash2, Download, XCircle, FileText, FileEdit } from "lucide-react";
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
import { useFocusNfe } from "@/hooks/useFocusNfe";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "rascunho", label: "Rascunho" },
  { value: "processando", label: "Processando" },
  { value: "autorizado", label: "Autorizada" },
  { value: "autorizada", label: "Autorizada" },
  { value: "rejeitado", label: "Rejeitada" },
  { value: "rejeitada", label: "Rejeitada" },
  { value: "cancelado", label: "Cancelada" },
  { value: "cancelada", label: "Cancelada" },
];

const getStatusBadgeVariant = (status: string | null) => {
  switch (status) {
    case "autorizado":
    case "autorizada":
      return "default";
    case "rascunho":
      return "secondary";
    case "processando":
      return "outline";
    case "rejeitado":
    case "rejeitada":
    case "cancelado":
    case "cancelada":
      return "destructive";
    default:
      return "outline";
  }
};

const getStatusLabel = (status: string | null) => {
  switch (status) {
    case "autorizado":
    case "autorizada":
      return "Autorizada";
    case "rascunho":
      return "Rascunho";
    case "processando":
      return "Processando";
    case "rejeitado":
    case "rejeitada":
      return "Rejeitada";
    case "cancelado":
    case "cancelada":
      return "Cancelada";
    default:
      return status || "-";
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
  const focusNfe = useFocusNfe();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCartaCorrecaoDialogOpen, setIsCartaCorrecaoDialogOpen] = useState(false);
  const [selectedNota, setSelectedNota] = useState<any>(null);
  const [justificativa, setJustificativa] = useState("");
  const [correcao, setCorrecao] = useState("");

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
      await deleteNotaFiscal.mutateAsync(selectedNota.id);
      setIsDeleteDialogOpen(false);
      setSelectedNota(null);
    }
  };

  const handleCancelar = async () => {
    if (selectedNota && justificativa.length >= 15) {
      const ref = selectedNota.uuid_api || `nfe_${selectedNota.id}`;
      await focusNfe.cancelarNfe(ref, selectedNota.id, justificativa);
      setIsCancelDialogOpen(false);
      setSelectedNota(null);
      setJustificativa("");
    } else {
      toast.error("Justificativa deve ter no mínimo 15 caracteres");
    }
  };

  const handleCartaCorrecao = async () => {
    if (selectedNota && correcao.length >= 15) {
      const ref = selectedNota.uuid_api || `nfe_${selectedNota.id}`;
      await focusNfe.emitirCartaCorrecao(ref, selectedNota.id, correcao);
      setIsCartaCorrecaoDialogOpen(false);
      setSelectedNota(null);
      setCorrecao("");
    } else {
      toast.error("Correção deve ter no mínimo 15 caracteres");
    }
  };

  const handleDownload = async (nota: any, tipo: "xml" | "danfe") => {
    const ref = nota.uuid_api || `nfe_${nota.id}`;
    await focusNfe.downloadArquivo(ref, tipo);
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
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="processando">Processando</SelectItem>
                <SelectItem value="autorizada">Autorizada</SelectItem>
                <SelectItem value="rejeitada">Rejeitada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
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
                {canEdit && <TableHead className="w-40">Ações</TableHead>}
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
                      {getStatusLabel(nota.status)}
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
                        
                        {/* Download DANFE */}
                        {(nota.status === "autorizado" || nota.status === "autorizada") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(nota, "danfe")}
                            title="Download DANFE"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Download XML */}
                        {(nota.status === "autorizado" || nota.status === "autorizada") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(nota, "xml")}
                            title="Download XML"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Carta de Correção */}
                        {(nota.status === "autorizado" || nota.status === "autorizada") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedNota(nota);
                              setIsCartaCorrecaoDialogOpen(true);
                            }}
                            title="Carta de Correção"
                          >
                            <FileEdit className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Cancelar NF-e */}
                        {(nota.status === "autorizado" || nota.status === "autorizada") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedNota(nota);
                              setIsCancelDialogOpen(true);
                            }}
                            title="Cancelar NF-e"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Excluir Rascunho */}
                        {nota.status === "rascunho" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedNota(nota);
                              setIsDeleteDialogOpen(true);
                            }}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Dialog de Cancelamento */}
        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar NF-e</DialogTitle>
              <DialogDescription>
                Informe a justificativa para o cancelamento (mínimo 15 caracteres).
                O cancelamento só pode ser feito em até 24h após a autorização.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="justificativa">Justificativa *</Label>
                <Textarea
                  id="justificativa"
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Informe o motivo do cancelamento..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {justificativa.length}/15 caracteres mínimos
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelar}
                disabled={justificativa.length < 15 || focusNfe.isLoading}
              >
                Cancelar NF-e
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Carta de Correção */}
        <Dialog open={isCartaCorrecaoDialogOpen} onOpenChange={setIsCartaCorrecaoDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Carta de Correção (CC-e)</DialogTitle>
              <DialogDescription>
                A carta de correção permite corrigir erros em dados da NF-e, exceto valores e impostos.
                Limite: 20 cartas por NF-e.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="correcao">Texto da Correção *</Label>
                <Textarea
                  id="correcao"
                  value={correcao}
                  onChange={(e) => setCorrecao(e.target.value)}
                  placeholder="Descreva a correção a ser feita..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {correcao.length}/15 caracteres mínimos
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCartaCorrecaoDialogOpen(false)}>
                Voltar
              </Button>
              <Button
                onClick={handleCartaCorrecao}
                disabled={correcao.length < 15 || focusNfe.isLoading}
              >
                Emitir CC-e
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
