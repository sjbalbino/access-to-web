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
import { Plus, Search, Eye, Trash2, Download, XCircle, FileText, FileEdit, RotateCcw, Mail, Ban, RefreshCw, Send, AlertCircle, Copy, FileSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmitentesNfe } from "@/hooks/useEmitentesNfe";
import { ContraNotaDialog, ContraNotaData } from "@/components/notas-fiscais/ContraNotaDialog";
import { EnviarEmailNfeDialog } from "@/components/notas-fiscais/EnviarEmailNfeDialog";
import { DanfePdfViewer } from "@/components/notas-fiscais/DanfePdfViewer";

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
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

const TZ_SP = "America/Sao_Paulo";
const formatDataEmissao = (dataEmissao: string | null | undefined, createdAt: string | null | undefined) => {
  const ts = dataEmissao || createdAt;
  if (!ts) return "-";
  const dataPart = formatInTimeZone(ts, TZ_SP, "dd/MM/yyyy");
  let horaPart = formatInTimeZone(ts, TZ_SP, "HH:mm");
  if (horaPart === "00:00" && createdAt && dataEmissao) {
    horaPart = formatInTimeZone(createdAt, TZ_SP, "HH:mm");
  }
  return `${dataPart} ${horaPart}`;
};
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
  const [searchInput, setSearchInput] = useState("");
  const [numeroNotaFilter, setNumeroNotaFilter] = useState("");
  const [numeroNotaInput, setNumeroNotaInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [emitenteFilter, setEmitenteFilter] = useState("todos");
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
  const [danfePreview, setDanfePreview] = useState<{ open: boolean; downloadUrl: string | null; pdfData: Uint8Array | null; filename: string; titulo: string; loading: boolean }>({ open: false, downloadUrl: null, pdfData: null, filename: "danfe.pdf", titulo: "", loading: false });

  const handleVisualizarDanfe = async (nota: any) => {
    const ref = nota.uuid_api || `nfe_${nota.id}`;
    const filename = `DANFE-${nota.numero || ref}.pdf`;
    setDanfePreview((prev) => {
      if (prev.downloadUrl) window.URL.revokeObjectURL(prev.downloadUrl);
      return { open: true, downloadUrl: null, pdfData: null, filename, titulo: `DANFE - NF-e nº ${nota.numero || ""}`, loading: true };
    });
    try {
      const { data, error } = await supabase.functions.invoke("focus-nfe-download", {
        body: { ref, tipo: "danfe", notaFiscalId: nota.id },
      });
      if (error) throw new Error(error.message);
      if (data && typeof data === "object" && "error" in data && !(data instanceof Blob) && !(data instanceof ArrayBuffer)) {
        throw new Error((data as any).error);
      }
      const blob = data instanceof Blob ? data : new Blob([data as ArrayBuffer], { type: "application/pdf" });
      const buffer = await blob.arrayBuffer();
      const pdfData = new Uint8Array(buffer);
      const downloadUrl = window.URL.createObjectURL(blob);
      setDanfePreview((prev) => ({ ...prev, downloadUrl, pdfData, loading: false }));
    } catch (e: any) {
      toast.error("Erro ao carregar DANFE", { description: e?.message });
      setDanfePreview({ open: false, downloadUrl: null, pdfData: null, filename: "danfe.pdf", titulo: "", loading: false });
    }
  };

  const closeDanfePreview = () => {
    setDanfePreview((prev) => {
      if (prev.downloadUrl) window.URL.revokeObjectURL(prev.downloadUrl);
      return { open: false, downloadUrl: null, pdfData: null, filename: "danfe.pdf", titulo: "", loading: false };
    });
  };

  const handleImprimirDanfe = () => {
    if (!danfePreview.downloadUrl) return;
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.src = danfePreview.downloadUrl;
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => { document.body.removeChild(frame); }, 1000);
    };
    document.body.appendChild(frame);
  };

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
    const termRaw = searchTerm.trim();
    const term = termRaw.toLowerCase();
    const termDigits = termRaw.replace(/\D/g, "");

    const norm = (v: string | null | undefined) => (v || "").toLowerCase();
    const digits = (v: string | null | undefined) => (v || "").replace(/\D/g, "");

    const matchesSearch =
      term === "" ||
      norm(nota.natureza_operacao).includes(term) ||
      norm(nota.dest_nome).includes(term) ||
      norm(nota.chave_acesso).includes(term) ||
      norm(nota.emitente?.inscricao?.nome).includes(term) ||
      norm(nota.granja?.razao_social).includes(term) ||
      norm(nota.granja?.nome_fantasia).includes(term) ||
      norm(nota.cfop?.codigo).includes(term) ||
      norm(nota.cfop?.descricao).includes(term) ||
      norm(nota.status).includes(term) ||
      (termDigits !== "" && (
        digits(nota.dest_cpf_cnpj).includes(termDigits) ||
        digits(nota.chave_acesso).includes(termDigits) ||
        digits(nota.emitente?.inscricao?.cpf_cnpj).includes(termDigits)
      ));

    const numeroNotaRaw = numeroNotaFilter.trim().replace(/\D/g, "");
    const matchesNumeroNota =
      numeroNotaRaw === "" ||
      digits(String(nota.numero ?? "")).includes(numeroNotaRaw);

    const matchesStatus = statusFilter === "todos" || nota.status === statusFilter;
    const matchesEmitente = emitenteFilter === "todos" || nota.emitente_id === emitenteFilter;
    return matchesSearch && matchesNumeroNota && matchesStatus && matchesEmitente;
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

  const [cceResult, setCceResult] = useState<{ open: boolean; nota: any; data: any } | null>(null);

  const handleCartaCorrecao = async () => {
    if (selectedNota && correcao.length >= 15) {
      const ref = selectedNota.uuid_api || `nfe_${selectedNota.id}`;
      const res = await focusNfe.emitirCartaCorrecao(ref, selectedNota.id, correcao);
      setIsCartaCorrecaoDialogOpen(false);
      if (res?.success) {
        setCceResult({ open: true, nota: selectedNota, data: (res as any).data ?? res });
      }
      setSelectedNota(null);
      setCorrecao("");
    } else {
      toast.error("Correção deve ter no mínimo 15 caracteres");
    }
  };


  const handleDownload = async (nota: any, tipo: "xml" | "danfe" | "xml_cancelamento" | "cce_pdf" | "cce_xml") => {
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
                placeholder="Buscar por destinatário, chave, natureza... (Enter para buscar)"
                value={searchInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchInput(v);
                  if (v === "") setSearchTerm("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setSearchTerm(searchInput);
                  }
                }}
                onBlur={() => setSearchTerm(searchInput)}
                className="pl-9"
              />
            </div>
            <div className="relative w-full sm:w-40">
              <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Nº da nota"
                value={numeroNotaInput}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setNumeroNotaInput(v);
                  if (v === "") setNumeroNotaFilter("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setNumeroNotaFilter(numeroNotaInput);
                  }
                }}
                onBlur={() => setNumeroNotaFilter(numeroNotaInput)}
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
            <ComboboxFilter
              value={emitenteFilter === "todos" ? "" : emitenteFilter}
              onValueChange={(v) => setEmitenteFilter(v || "todos")}
              options={(emitentes || []).map((e: any) => ({
                value: e.id,
                label: `${e.inscricao?.nome || e.granja?.razao_social || "Sem nome"}${e.inscricao?.cpf_cnpj ? ` — ${formatCpfCnpj(e.inscricao.cpf_cnpj)}` : ""}`,
              }))}
              placeholder="Todos os emitentes"
              searchPlaceholder="Buscar emitente..."
              emptyText="Nenhum emitente encontrado."
              className="w-full sm:w-64"
            />

          </div>
          {canEdit && (
            <div className="flex gap-2 flex-wrap">
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
                  <TableHead>Emitente</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead className="hidden lg:table-cell">Natureza Op.</TableHead>
                  <TableHead>Data Emissão</TableHead>
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
                    <TableCell className="text-sm">
                      <div className="font-medium whitespace-normal break-words" title={nota.emitente?.inscricao?.nome || "-"}>
                        {nota.emitente?.inscricao?.nome || "-"}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        IE: {(nota.emitente?.inscricao as any)?.inscricao_estadual || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium truncate max-w-[150px]">{nota.dest_nome || "-"}</div>
                        <div className="text-xs text-muted-foreground font-mono hidden sm:block">{formatCpfCnpj(nota.dest_cpf_cnpj) || "-"}</div>
                      </div>
                    </TableCell>

                    <TableCell className="truncate max-w-[150px] hidden lg:table-cell">{nota.natureza_operacao}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {nota.data_emissao ? format(new Date(nota.data_emissao), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium hidden sm:table-cell">{formatCurrency(nota.total_nota)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusBadgeVariant(nota.status)}
                        title={
                          (nota.status === "cancelado" || nota.status === "cancelada")
                            ? `Cancelada por ${(nota as any).cancelado_por_nome || "—"} em ${
                                (nota as any).cancelado_em
                                  ? format(new Date((nota as any).cancelado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                  : "—"
                              }\nMotivo: ${(nota as any).cancelado_motivo || nota.motivo_status || "—"}`
                            : undefined
                        }
                      >
                        {getStatusLabel(nota.status)}
                      </Badge>
                      {(nota.status === "cancelado" || nota.status === "cancelada") && ((nota as any).cancelado_por_nome || (nota as any).cancelado_em) && (
                        <div className="mt-1 text-[10px] leading-tight text-muted-foreground max-w-[220px]">
                          <div>
                            Por <span className="font-medium">{(nota as any).cancelado_por_nome || "—"}</span>
                            {(nota as any).cancelado_em && (
                              <> em {format(new Date((nota as any).cancelado_em), "dd/MM/yy HH:mm", { locale: ptBR })}</>
                            )}
                          </div>
                          {((nota as any).cancelado_motivo || nota.motivo_status) && (
                            <div className="truncate" title={(nota as any).cancelado_motivo || nota.motivo_status}>
                              Motivo: {(nota as any).cancelado_motivo || nota.motivo_status}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="sticky right-0 bg-background">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/notas-fiscais/${nota.id}`)} title="Visualizar/Editar" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDuplicar(nota)} title="Duplicar NF-e (nova cópia como rascunho)" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950">
                            <Copy className="h-4 w-4" />
                          </Button>
                          {(nota.status === "autorizado" || nota.status === "autorizada") && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleVisualizarDanfe(nota)} title="Visualizar DANFE" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950">
                                <FileSearch className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDownload(nota, "danfe")} title="Download DANFE" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950" onClick={() => handleDownload(nota, "xml")} title="Download XML">
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950" onClick={() => { setSelectedNota(nota); setIsEnviarEmailDialogOpen(true); }} title="Enviar por Email">
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950" onClick={() => { setSelectedNota(nota); setIsCartaCorrecaoDialogOpen(true); }} title="Carta de Correção">
                                <FileEdit className="h-4 w-4" />
                              </Button>
                              {typeof nota.info_complementar === "string" && nota.info_complementar.includes("Carta de Correção") && (
                                <>
                                  <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950" onClick={() => handleDownload(nota, "cce_pdf")} title="Baixar PDF da Carta de Correção">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950" onClick={() => handleDownload(nota, "cce_xml")} title="Baixar XML da Carta de Correção">
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                </>
                              )}

                              <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950" onClick={() => { setSelectedNota(nota); setIsCancelDialogOpen(true); }} title="Cancelar NF-e">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {(nota.status === "cancelado" || nota.status === "cancelada") && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleDownload(nota, "danfe")} title="Baixar DANFE (com tarja CANCELADA)" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950" onClick={() => handleDownload(nota, "xml")} title="Baixar XML da NF-e">
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950" onClick={() => handleDownload(nota, "xml_cancelamento")} title="Baixar XML de Cancelamento">
                                <FileText className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {(nota.status === "rejeitada" || nota.status === "rejeitado" || nota.status === "erro_autorizacao" || nota.status === "processando") && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleConsultarRejeicao(nota)} title="Consultar motivo da rejeição" disabled={focusNfe.isLoading} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                <AlertCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/notas-fiscais/${nota.id}`)} title="Corrigir e reenviar" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950">
                                <Send className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {(nota.status === "rascunho" || nota.status === "rejeitada" || nota.status === "rejeitado" || nota.status === "erro_autorizacao") && (
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedNota(nota); setAlsoInutilizar(["erro_autorizacao","rejeitada","rejeitado"].includes(nota.status) && !!nota.numero && !isEmitenteCpf(nota.emitente_id)); setIsDeleteDialogOpen(true); }} title="Excluir" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950">
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
                    <TableCell colSpan={canEdit ? 9 : 8} className="text-center py-8 text-muted-foreground">Nenhuma nota fiscal encontrada</TableCell>
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

            {selectedNota && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                <div><span className="text-muted-foreground">Nº:</span> <span className="font-medium">{selectedNota.numero || "—"}{selectedNota.serie ? ` / Série ${selectedNota.serie}` : ""}</span></div>
                <div><span className="text-muted-foreground">Destinatário:</span> <span className="font-medium">{selectedNota.dest_nome || "—"}</span></div>
                <div><span className="text-muted-foreground">Valor:</span> <span className="font-medium">{formatCurrency(selectedNota.total_nota)}</span></div>
              </div>
            )}

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

        {/* Dialog de Retorno SEFAZ da CC-e */}
        <Dialog open={!!cceResult?.open} onOpenChange={(o) => setCceResult(o ? cceResult : null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Retorno SEFAZ - Carta de Correção</DialogTitle>
              <DialogDescription>
                NF-e nº {cceResult?.nota?.numero ?? "-"} · Série {cceResult?.nota?.serie ?? "-"}
              </DialogDescription>
            </DialogHeader>
            {cceResult?.data && (
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-[160px_1fr] gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">{cceResult.data.status ?? "-"}</span>
                  <span className="text-muted-foreground">Nº Sequência CC-e:</span>
                  <span className="font-medium">{cceResult.data.numero_carta_correcao ?? cceResult.data.sequencia_evento ?? "-"}</span>
                  <span className="text-muted-foreground">Protocolo:</span>
                  <span className="font-mono">{cceResult.data.numero_protocolo ?? cceResult.data.protocolo ?? "-"}</span>
                  <span className="text-muted-foreground">Data do Evento:</span>
                  <span>{cceResult.data.data_evento ? new Date(cceResult.data.data_evento).toLocaleString("pt-BR") : "-"}</span>
                  <span className="text-muted-foreground">Mensagem SEFAZ:</span>
                  <span>{cceResult.data.mensagem_sefaz ?? cceResult.data.motivo ?? "-"}</span>
                  <span className="text-muted-foreground">Ambiente:</span>
                  <span>{cceResult.data.ambiente ?? "-"}</span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Texto da correção enviado:</p>
                  <p className="text-sm p-2 bg-muted rounded whitespace-pre-wrap">{cceResult.data.correcao ?? "-"}</p>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              {cceResult?.nota && (
                <>
                  <Button variant="outline" onClick={() => handleDownload(cceResult.nota, "cce_pdf")}>
                    <Download className="h-4 w-4 mr-2" /> PDF CC-e
                  </Button>
                  <Button variant="outline" onClick={() => handleDownload(cceResult.nota, "cce_xml")}>
                    <FileText className="h-4 w-4 mr-2" /> XML CC-e
                  </Button>
                </>
              )}
              <Button onClick={() => setCceResult(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


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

        {/* Dialog de Visualização da DANFE */}
        <Dialog open={danfePreview.open} onOpenChange={(open) => { if (!open) closeDanfePreview(); }}>
          <DialogContent className="max-w-6xl w-[95vw] h-[92vh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
              <DialogTitle className="text-base truncate flex items-center gap-2">
                <FileSearch className="h-5 w-5 text-primary" />
                {danfePreview.titulo}
              </DialogTitle>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={handleImprimirDanfe} disabled={!danfePreview.downloadUrl}>
                  <FileText className="h-4 w-4 mr-1" /> Imprimir
                </Button>
                {danfePreview.downloadUrl && (
                  <Button size="sm" asChild>
                    <a href={danfePreview.downloadUrl} download={danfePreview.filename}>
                      <Download className="h-4 w-4 mr-1" /> Baixar PDF
                    </a>
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={closeDanfePreview}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-hidden bg-muted/30">
              {danfePreview.loading || !danfePreview.pdfData ? (
                <div className="flex items-center justify-center h-full">
                  <Spinner />
                </div>
              ) : (
                <DanfePdfViewer pdfData={danfePreview.pdfData} />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
