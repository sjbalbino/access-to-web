import type { LucideIcon } from "lucide-react";
import {
  Eye,
  Copy,
  FileSearch,
  Download,
  AlertCircle,
  Send,
  FileText,
  Mail,
  FileEdit,
  XCircle,
  Trash2,
} from "lucide-react";

export type TipoDownloadNfe = "xml" | "danfe" | "xml_cancelamento" | "cce_pdf" | "cce_xml";

export interface NotaFiscalAcao {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Cor semântica/utilitária aplicada ao ícone */
  iconClass?: string;
  /** Classe extra aplicada ao botão do desktop (cores de hover) */
  buttonClass?: string;
  onClick: () => void;
  /** primary = botões de ícone visíveis; secondary = itens do menu "mais ações" */
  group: "primary" | "secondary";
  destructive?: boolean;
  disabled?: boolean;
}

export interface NotaFiscalAcoesHandlers {
  onVisualizar: () => void;
  onDuplicar: () => void;
  onVisualizarDanfe: () => void;
  onDownload: (tipo: TipoDownloadNfe) => void;
  onEnviarEmail: () => void;
  onCartaCorrecao: () => void;
  onCancelar: () => void;
  onConsultarRejeicao: () => void;
  onCorrigirReenviar: () => void;
  onExcluir: () => void;
  consultaLoading?: boolean;
}

interface NotaFiscalAcoesInput {
  status: string | null | undefined;
  info_complementar?: string | null;
}

/**
 * Monta a lista de ações válidas para uma NF-e conforme o seu status.
 * Fonte única de verdade usada pela tabela (desktop) e pelos cards (mobile).
 */
export function buildNotaFiscalAcoes(
  nota: NotaFiscalAcoesInput,
  h: NotaFiscalAcoesHandlers
): NotaFiscalAcao[] {
  const status = nota.status ?? "";
  const isAutorizada = status === "autorizado" || status === "autorizada";
  const isCancelada = status === "cancelado" || status === "cancelada";
  const isRejeitada =
    status === "rejeitada" || status === "rejeitado" || status === "erro_autorizacao";
  const isRejeitadaOuProcessando = isRejeitada || status === "processando";
  const podeExcluir = status === "rascunho" || isRejeitada;
  const temCce =
    typeof nota.info_complementar === "string" &&
    nota.info_complementar.includes("Carta de Correção");

  const acoes: NotaFiscalAcao[] = [
    {
      key: "visualizar",
      label: "Visualizar / Editar",
      icon: Eye,
      iconClass: "text-blue-600 dark:text-blue-400",
      buttonClass:
        "text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950",
      onClick: h.onVisualizar,
      group: "primary",
    },
    {
      key: "duplicar",
      label: "Duplicar NF-e (cópia como rascunho)",
      icon: Copy,
      iconClass: "text-purple-600 dark:text-purple-400",
      buttonClass:
        "text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950",
      onClick: h.onDuplicar,
      group: "primary",
    },
  ];

  if (isAutorizada) {
    acoes.push(
      {
        key: "danfe-view",
        label: "Visualizar DANFE",
        icon: FileSearch,
        iconClass: "text-indigo-600 dark:text-indigo-400",
        buttonClass:
          "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950",
        onClick: h.onVisualizarDanfe,
        group: "primary",
      },
      {
        key: "danfe-download",
        label: "Download DANFE",
        icon: Download,
        iconClass: "text-emerald-600 dark:text-emerald-400",
        buttonClass:
          "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950",
        onClick: () => h.onDownload("danfe"),
        group: "primary",
      }
    );
  }

  if (isCancelada) {
    acoes.push({
      key: "danfe-download-cancelada",
      label: "Baixar DANFE (tarja CANCELADA)",
      icon: Download,
      iconClass: "text-emerald-600 dark:text-emerald-400",
      buttonClass:
        "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950",
      onClick: () => h.onDownload("danfe"),
      group: "primary",
    });
  }

  if (isRejeitadaOuProcessando) {
    acoes.push(
      {
        key: "consultar-rejeicao",
        label: "Consultar motivo da rejeição",
        icon: AlertCircle,
        iconClass: "text-destructive",
        buttonClass: "text-destructive hover:text-destructive hover:bg-destructive/10",
        onClick: h.onConsultarRejeicao,
        group: "primary",
        disabled: h.consultaLoading,
      },
      {
        key: "corrigir-reenviar",
        label: "Corrigir e reenviar",
        icon: Send,
        iconClass: "text-indigo-600 dark:text-indigo-400",
        buttonClass:
          "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950",
        onClick: h.onCorrigirReenviar,
        group: "primary",
      }
    );
  }

  if (isAutorizada) {
    acoes.push(
      {
        key: "xml",
        label: "Download XML",
        icon: FileText,
        iconClass: "text-teal-600",
        onClick: () => h.onDownload("xml"),
        group: "secondary",
      },
      {
        key: "email",
        label: "Enviar por Email",
        icon: Mail,
        iconClass: "text-sky-600",
        onClick: h.onEnviarEmail,
        group: "secondary",
      },
      {
        key: "cce",
        label: "Carta de Correção",
        icon: FileEdit,
        iconClass: "text-amber-600",
        onClick: h.onCartaCorrecao,
        group: "secondary",
      }
    );

    if (temCce) {
      acoes.push(
        {
          key: "cce-pdf",
          label: "PDF da Carta de Correção",
          icon: Download,
          iconClass: "text-amber-700",
          onClick: () => h.onDownload("cce_pdf"),
          group: "secondary",
        },
        {
          key: "cce-xml",
          label: "XML da Carta de Correção",
          icon: FileText,
          iconClass: "text-amber-700",
          onClick: () => h.onDownload("cce_xml"),
          group: "secondary",
        }
      );
    }

    acoes.push({
      key: "cancelar",
      label: "Cancelar NF-e",
      icon: XCircle,
      iconClass: "text-orange-600",
      onClick: h.onCancelar,
      group: "secondary",
    });
  }

  if (isCancelada) {
    acoes.push(
      {
        key: "xml-nfe",
        label: "Baixar XML da NF-e",
        icon: FileText,
        iconClass: "text-teal-600",
        onClick: () => h.onDownload("xml"),
        group: "secondary",
      },
      {
        key: "xml-cancelamento",
        label: "Baixar XML de Cancelamento",
        icon: FileText,
        iconClass: "text-rose-600",
        onClick: () => h.onDownload("xml_cancelamento"),
        group: "secondary",
      }
    );
  }

  if (podeExcluir) {
    acoes.push({
      key: "excluir",
      label: "Excluir",
      icon: Trash2,
      onClick: h.onExcluir,
      group: "secondary",
      destructive: true,
    });
  }

  return acoes;
}
