import type jsPDF from "jspdf";

export interface RelatorioSheet {
  name: string;
  header: string[];
  rows: (string | number | null | undefined)[][];
}

export interface RelatorioPayload {
  doc: jsPDF;
  filename: string;
  sheets?: RelatorioSheet[];
}

type Handler = (payload: RelatorioPayload) => void;

let pendingHandler: Handler | null = null;
let pendingSheets: RelatorioSheet[] | undefined;

/**
 * Registra um handler que consumirá o próximo relatório gerado.
 * Retorna uma Promise que resolve quando o relatório for entregue.
 * As sheets opcionais serão mescladas no payload entregue.
 */
export function captureNextRelatorio(sheets?: RelatorioSheet[]): Promise<RelatorioPayload> {
  pendingSheets = sheets;
  return new Promise<RelatorioPayload>((resolve) => {
    pendingHandler = (payload) => {
      pendingHandler = null;
      const merged = { ...payload, sheets: pendingSheets ?? payload.sheets };
      pendingSheets = undefined;
      resolve(merged);
    };
  });
}

/** Define/atualiza as sheets do relatório em andamento (chamado antes/depois da captura). */
export function setPendingSheets(sheets: RelatorioSheet[]) {
  pendingSheets = sheets;
}

/** Cancela qualquer captura pendente (usar em caso de erro). */
export function cancelPendingCapture() {
  pendingHandler = null;
  pendingSheets = undefined;
}

/**
 * Substitui `doc.save(...)` / downloadPdf nos geradores.
 * Se houver handler pendente, entrega ao preview; senão faz download direto
 * (fallback para uso fora do fluxo do RelatorioDialog).
 */
export function entregarRelatorio(doc: jsPDF, filename: string) {
  if (pendingHandler) {
    pendingHandler({ doc, filename });
    return;
  }
  // Fallback — download imediato via <a download>, sem popup (não bloqueado).
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
