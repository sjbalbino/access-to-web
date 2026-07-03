import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Search, Eye, Trash2, Download, XCircle, FileText, FileEdit, RotateCcw, Mail, Ban, RefreshCw, Send, AlertCircle, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmitentesNfe } from "@/hooks/useEmitentesNfe";
import { ContraNotaDialog, ContraNotaData } from "@/components/notas-fiscais/ContraNotaDialog";
import { EnviarEmailNfeDialog } from "@/components/notas-fiscais/EnviarEmailNfeDialog";
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
import { formatCpfCnpj } from "@/lib/formatters";
import { usePaginacao } from "@/hooks/usePaginacao";
import { TablePagination } from "@/components/ui/table-pagination";
import { ComboboxFilter } from "@/components/ui/combobox-filter";

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
    case "erro_autorizacao":
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
    case "erro_autorizacao":
      return "Erro Autorização";
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
  const { emitentes } = useEmitentesNfe();

  const isEmitenteCpf = (emitenteId: string | null | undefined): boolean => {
    if (!emitenteId) return false;
    const em = emitentes?.find((e: any) => e.id === emitenteId);
    const doc = (em as any)?.inscricao?.cpf_cnpj?.replace(/\D/g, "") ?? "";
    return doc.length === 11;
  };
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [alsoInutilizar, setAlsoInutilizar] = useState(false);
  const [inutJustificativa, setInutJustificativa] = useState("");
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCartaCorrecaoDialogOpen, setIsCartaCorrecaoDialogOpen] = useState(false);
  const [isContraNotaDialogOpen, setIsContraNotaDialogOpen] = useState(false);
  const [isEnviarEmailDialogOpen, setIsEnviarEmailDialogOpen] = useState(false);
  const [isInutilizarDialogOpen, setIsInutilizarDialogOpen] = useState(false);
  const [selectedNota, setSelectedNota] = useState<any>(null);
  const [justificativa, setJustificativa] = useState("");
  const [correcao, setCorrecao] = useState("");
  const [inutForm, setInutForm] = useState({ emitenteId: "", serie: "1", numeroInicial: "", numeroFinal: "", justificativa: "" });
  const [motivoDialog, setMotivoDialog] = useState<{ open: boolean; titulo: string; mensagem: string }>({ open: false, titulo: "", mensagem: "" });

  const handleConsultarRejeicao = async (nota: any) => {
    const ref = nota.uuid_api || `nfe_${nota.id}`;
    const result = await focusNfe.consultarNfe(ref, nota.id);
    const d = (result.data || {}) as Record<string, any>;
    const msg = d.mensagem_sefaz || d.motivo_status || d.erros?.[0]?.mensagem || result.error || "Sem detalhes retornados pela SEFAZ.";
    const codigo = d.codigo_status ? ` (código ${d.codigo_status})` : "";
    setMotivoDialog({
      open: true,
      titulo: `NF-e nº ${nota.numero} — ${d.status || nota.status}${codigo}`,
      mensagem: String(msg),
    });
  };

  const handleDuplicar = async (nota: any) => {
    try {
      // Busca completa da NF-e original
      const { data: original, error: errNota } = await supabase
        .from("notas_fiscais")
        .select("*")
        .eq("id", nota.id)
        .single();
      if (errNota || !original) throw errNota || new Error("NF-e não encontrada");

      const { data: itens, error: errItens } = await supabase
        .from("notas_fiscais_itens")
        .select("*")
        .eq("nota_fiscal_id", nota.id);
      if (errItens) throw errItens;

      // Remove campos fiscais / de identidade que não devem ser copiados
      const BLACKLIST = new Set([
        "id", "created_at", "updated_at",
        "numero", "chave_acesso", "protocolo_autorizacao", "uuid_api",
        "status", "xml_url", "danfe_url", "data_autorizacao",
        "motivo_status", "mensagem_sefaz", "codigo_status",
        "data_cancelamento", "justificativa_cancelamento", "protocolo_cancelamento",
        "remessa_id", "contrato_id", "compra_cereais_id",
      ]);
      const novaNota: Record<string, any> = {};
      for (const [k, v] of Object.entries(original)) {
        if (!BLACKLIST.has(k)) novaNota[k] = v;
      }
      novaNota.status = "rascunho";
      novaNota.data_emissao = new Date().toISOString().split("T")[0];
      novaNota.natureza_operacao = `${original.natureza_operacao || ""} (cópia)`.trim();

      const { data: created, error: errCreate } = await supabase
        .from("notas_fiscais")
        .insert(novaNota as any)
        .select()
        .single();
      if (errCreate || !created) throw errCreate || new Error("Falha ao criar cópia");

      // Copia itens (sem id, created_at, e apontando para nova nota)
      if (itens && itens.length > 0) {
        const novosItens = itens.map((it: any) => {
          const { id: _i, created_at: _c, updated_at: _u, ...rest } = it;
          return { ...rest, nota_fiscal_id: created.id };
        });
        const { error: errIns } = await supabase.from("notas_fiscais_itens").insert(novosItens);
        if (errIns) throw errIns;
      }

      // Copia duplicatas de cobrança
      const { data: dups } = await supabase
        .from("notas_fiscais_duplicatas")
        .select("*")
        .eq("nota_fiscal_id", nota.id);
      if (dups && dups.length > 0) {
        const novasDups = dups.map((d: any) => {
          const { id: _i, created_at: _c, updated_at: _u, ...rest } = d;
          return { ...rest, nota_fiscal_id: created.id };
        });
        const { error: errDup } = await supabase.from("notas_fiscais_duplicatas").insert(novasDups);
        if (errDup) throw errDup;
      }

      toast.success("NF-e duplicada como rascunho. Ajuste e emita.");
      navigate(`/notas-fiscais/${created.id}`);
    } catch (e: any) {
      toast.error("Erro ao duplicar NF-e", { description: e?.message });
    }
  };

  const handleContraNotaSelect = (data: ContraNotaData) => {
    navigate("/notas-fiscais/nova", { state: { contraNotaData: data } });
  };

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
    if (!selectedNota) return;
    const isErro = ["erro_autorizacao", "rejeitada", "rejeitado"].includes(selectedNota.status);
    if (isErro && alsoInutilizar) {
      if (inutJustificativa.trim().length < 15) {
        toast.error("Justificativa da inutilização deve ter no mínimo 15 caracteres");
        return;
      }
      if (!selectedNota.emitente_id) {
        toast.error("Emitente não identificado na NF-e — não é possível inutilizar");
        return;
      }
      const res = await focusNfe.inutilizarNumeracao({
        emitenteId: selectedNota.emitente_id,
        serie: selectedNota.serie ?? 1,
        numeroInicial: selectedNota.numero,
        numeroFinal: selectedNota.numero,
        justificativa: inutJustificativa.trim(),
      });
      if (!res?.success) {
        const err = String(res?.error || "");
        const isCpfCase = /Pessoa F[íi]sica \(CPF\)|não é permitida para emitente/i.test(err);
        if (isCpfCase) {
          toast.info("Emitente é Pessoa Física (CPF) — inutilização não se aplica. Prosseguindo com a exclusão.");
        } else {
          return; // aborta exclusão se inutilização falhar por outro motivo
        }
      }
    }
    await deleteNotaFiscal.mutateAsync(selectedNota.id);
    setIsDeleteDialogOpen(false);
    setSelectedNota(null);
    setAlsoInutilizar(false);
    setInutJustificativa("");
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
    await focusNfe.downloadArquivo(ref, tipo, nota.id);
  };

  const {
    dadosPaginados,
    paginaAtual,
    totalPaginas,
    totalRegistros,
    setPaginaAtual,
    gerarNumerosPaginas,
  } = usePaginacao(filteredNotas || []);

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
            <ComboboxFilter
              value={statusFilter === "todos" ? "" : statusFilter}
              onValueChange={(v) => setStatusFilter(v || "todos")}
              options={[
                { value: "rascunho", label: "Rascunho" },
                { value: "processando", label: "Processando" },
                { value: "autorizada", label: "Autorizada" },
                { value: "rejeitada", label: "Rejeitada" },
                { value: "cancelada", label: "Cancelada" },
              ]}
              searchPlaceholder="Buscar status..."
              emptyText="Nenhum status encontrado."
              className="w-full sm:w-40"
            />
          </div>
          {canEdit && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setIsInutilizarDialogOpen(true)}>
                <Ban className="h-4 w-4 mr-2" />
                Inutilizar Numeração
              </Button>
              <Button variant="outline" onClick={() => setIsContraNotaDialogOpen(true)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Contra-Nota
              </Button>
              <Button onClick={() => navigate("/notas-fiscais/nova")}>
                <Plus className="h-4 w-4 mr-2" />
                Nova NF-e
              </Button>
            </div>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredNotas.length} nota(s) encontrada(s)
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Número</TableHead>
                  <TableHead className="hidden md:table-cell w-20">Série</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead className="hidden lg:table-cell">Natureza Op.</TableHead>
                  <TableHead className="hidden sm:table-cell">Data Emissão</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="sticky right-0 bg-background">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosPaginados.map((nota) => (
                  <TableRow key={nota.id}>
                    <TableCell className="font-mono">{nota.numero || "-"}</TableCell>
                    <TableCell className="font-mono hidden md:table-cell">{nota.serie || "-"}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium truncate max-w-[150px]">{nota.dest_nome || "-"}</div>
                        <div className="text-xs text-muted-foreground font-mono hidden sm:block">{formatCpfCnpj(nota.dest_cpf_cnpj) || "-"}</div>
                      </div>
                    </TableCell>
                    <TableCell className="truncate max-w-[150px] hidden lg:table-cell">{nota.natureza_operacao}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {nota.data_emissao ? format(new Date(nota.data_emissao.split('T')[0] + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium hidden sm:table-cell">{formatCurrency(nota.total_nota)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(nota.status)}>{getStatusLabel(nota.status)}</Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="sticky right-0 bg-background">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/notas-fiscais/${nota.id}`)} title="Visualizar/Editar">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDuplicar(nota)} title="Duplicar NF-e (nova cópia como rascunho)">
                            <Copy className="h-4 w-4" />
                          </Button>
                          {(nota.status === "autorizado" || nota.status === "autorizada") && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleDownload(nota, "danfe")} title="Download DANFE">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={() => handleDownload(nota, "xml")} title="Download XML">
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={() => { setSelectedNota(nota); setIsEnviarEmailDialogOpen(true); }} title="Enviar por Email">
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={() => { setSelectedNota(nota); setIsCartaCorrecaoDialogOpen(true); }} title="Carta de Correção">
                                <FileEdit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={() => { setSelectedNota(nota); setIsCancelDialogOpen(true); }} title="Cancelar NF-e">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {(nota.status === "rejeitada" || nota.status === "rejeitado" || nota.status === "erro_autorizacao" || nota.status === "processando") && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleConsultarRejeicao(nota)} title="Consultar motivo da rejeição" disabled={focusNfe.isLoading}>
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/notas-fiscais/${nota.id}`)} title="Corrigir e reenviar">
                                <Send className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {(nota.status === "rascunho" || nota.status === "rejeitada" || nota.status === "rejeitado" || nota.status === "erro_autorizacao") && (
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedNota(nota); setAlsoInutilizar(["erro_autorizacao","rejeitada","rejeitado"].includes(nota.status) && !!nota.numero && !isEmitenteCpf(nota.emitente_id)); setIsDeleteDialogOpen(true); }} title="Excluir">
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
                    <TableCell colSpan={canEdit ? 8 : 7} className="text-center py-8 text-muted-foreground">Nenhuma nota fiscal encontrada</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="px-4">
            <TablePagination paginaAtual={paginaAtual} totalPaginas={totalPaginas} totalRegistros={totalRegistros} setPaginaAtual={setPaginaAtual} gerarNumerosPaginas={gerarNumerosPaginas} />
          </div>
        </div>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={(o) => {
            setIsDeleteDialogOpen(o);
            if (!o) { setAlsoInutilizar(false); setInutJustificativa(""); }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta NF-e? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {selectedNota && !!selectedNota.numero && !isEmitenteCpf(selectedNota.emitente_id) && ["erro_autorizacao", "rejeitada", "rejeitado"].includes(selectedNota.status) && (
              <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="also-inut"
                    checked={alsoInutilizar}
                    onCheckedChange={(v) => setAlsoInutilizar(Boolean(v))}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="also-inut" className="cursor-pointer">
                      Também inutilizar o número {selectedNota.numero} (série {selectedNota.serie ?? 1}) na SEFAZ
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Recomendado quando a rejeição foi definitiva (com protocolo). Evita gap de numeração em auditoria fiscal.
                    </p>
                  </div>
                </div>
                {alsoInutilizar && (
                  <div className="space-y-1">
                    <Label htmlFor="inut-just" className="text-xs">Justificativa (mín. 15 caracteres)</Label>
                    <Textarea
                      id="inut-just"
                      value={inutJustificativa}
                      onChange={(e) => setInutJustificativa(e.target.value)}
                      placeholder="Ex: NF-e rejeitada pela SEFAZ, inutilização da numeração"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={focusNfe.isLoading || deleteNotaFiscal.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {alsoInutilizar ? "Inutilizar e Excluir" : "Excluir"}
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
        {/* Dialog de Contra-Nota */}
        <ContraNotaDialog
          open={isContraNotaDialogOpen}
          onOpenChange={setIsContraNotaDialogOpen}
          onSelect={handleContraNotaSelect}
        />
        {/* Dialog de Envio por Email */}
        <EnviarEmailNfeDialog
          open={isEnviarEmailDialogOpen}
          onOpenChange={setIsEnviarEmailDialogOpen}
          nota={selectedNota}
        />

        {/* Dialog de Inutilização de Numeração */}
        <Dialog open={isInutilizarDialogOpen} onOpenChange={setIsInutilizarDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inutilizar Numeração de NF-e</DialogTitle>
              <DialogDescription>
                Inutiliza uma faixa de numeração não utilizada na SEFAZ. Use quando houver
                quebra de sequência (números pulados). Operação irreversível.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Emitente *</Label>
                <Select value={inutForm.emitenteId} onValueChange={(v) => setInutForm({ ...inutForm, emitenteId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o emitente" /></SelectTrigger>
                  <SelectContent>
                    {emitentes.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.inscricao?.nome || e.granja?.razao_social} - Série {e.serie_nfe} (Atual: {e.numero_atual_nfe})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label>Série *</Label>
                  <Input type="number" value={inutForm.serie} onChange={(e) => setInutForm({ ...inutForm, serie: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nº Inicial *</Label>
                  <Input type="number" value={inutForm.numeroInicial} onChange={(e) => setInutForm({ ...inutForm, numeroInicial: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nº Final *</Label>
                  <Input type="number" value={inutForm.numeroFinal} onChange={(e) => setInutForm({ ...inutForm, numeroFinal: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Justificativa *</Label>
                <Textarea
                  value={inutForm.justificativa}
                  onChange={(e) => setInutForm({ ...inutForm, justificativa: e.target.value })}
                  placeholder="Motivo da inutilização (mínimo 15 caracteres)..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">{inutForm.justificativa.length}/15 caracteres mínimos</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInutilizarDialogOpen(false)}>Voltar</Button>
              <Button
                variant="destructive"
                disabled={
                  !inutForm.emitenteId ||
                  !inutForm.serie ||
                  !inutForm.numeroInicial ||
                  !inutForm.numeroFinal ||
                  inutForm.justificativa.length < 15 ||
                  focusNfe.isLoading
                }
                onClick={async () => {
                  const res = await focusNfe.inutilizarNumeracao({
                    emitenteId: inutForm.emitenteId,
                    serie: inutForm.serie,
                    numeroInicial: inutForm.numeroInicial,
                    numeroFinal: inutForm.numeroFinal,
                    justificativa: inutForm.justificativa,
                  });
                  if (res?.success) {
                    setIsInutilizarDialogOpen(false);
                    setInutForm({ emitenteId: "", serie: "1", numeroInicial: "", numeroFinal: "", justificativa: "" });
                  }
                }}
              >
                Inutilizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Motivo da Rejeição */}
        <Dialog open={motivoDialog.open} onOpenChange={(open) => setMotivoDialog((prev) => ({ ...prev, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                {motivoDialog.titulo}
              </DialogTitle>
              <DialogDescription>Detalhes retornados pela SEFAZ / Focus NFe</DialogDescription>
            </DialogHeader>
            <div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap break-words">
              {motivoDialog.mensagem}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMotivoDialog({ open: false, titulo: "", mensagem: "" })}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
