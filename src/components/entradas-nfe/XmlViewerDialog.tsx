import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Download, Copy, Check, FileCode, X } from "lucide-react";
import { toast } from "sonner";

export interface XmlViewerState {
  open: boolean;
  loading: boolean;
  xml: string | null;
  filename: string;
  titulo: string;
}

export const xmlViewerInitialState: XmlViewerState = {
  open: false,
  loading: false,
  xml: null,
  filename: "nfe.xml",
  titulo: "",
};

/**
 * Formata o XML com indentação de 2 espaços para leitura.
 * Não altera o conteúdo semântico — apenas quebras de linha e recuo.
 */
function formatarXml(xml: string): string {
  try {
    const semQuebras = xml.replace(/>\s+</g, "><").trim();
    const partes = semQuebras.replace(/(>)(<)/g, "$1\n$2").split("\n");
    let nivel = 0;
    const linhas: string[] = [];
    for (const parte of partes) {
      const p = parte.trim();
      if (!p) continue;
      const fecha = /^<\//.test(p);
      const abreEFecha = /^<[^!?][^>]*\/>$/.test(p) || (/^<[^!?/][^>]*>/.test(p) && /<\/[^>]+>$/.test(p));
      if (fecha) nivel = Math.max(0, nivel - 1);
      linhas.push("  ".repeat(nivel) + p);
      if (!fecha && !abreEFecha && /^<[^!?/][^>]*[^/]>$/.test(p)) nivel += 1;
    }
    return linhas.join("\n");
  } catch {
    return xml;
  }
}

interface XmlViewerDialogProps {
  state: XmlViewerState;
  onClose: () => void;
}

export function XmlViewerDialog({ state, onClose }: XmlViewerDialogProps) {
  const [copiado, setCopiado] = useState(false);
  const xmlFormatado = useMemo(() => (state.xml ? formatarXml(state.xml) : ""), [state.xml]);

  const handleCopiar = async () => {
    if (!state.xml) return;
    try {
      await navigator.clipboard.writeText(state.xml);
      setCopiado(true);
      toast.success("XML copiado para a área de transferência");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o XML");
    }
  };

  const handleBaixar = () => {
    if (!state.xml) return;
    const blob = new Blob([state.xml], { type: "application/xml" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = state.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(url), 3000);
    toast.success("Download do XML iniciado");
  };

  return (
    <Dialog open={state.open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl w-[95vw] h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base truncate flex items-center gap-2">
            <FileCode className="h-5 w-5 text-primary" />
            {state.titulo || "XML da NF-e"}
          </DialogTitle>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={handleCopiar} disabled={!state.xml}>
              {copiado ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copiado ? "Copiado" : "Copiar"}
            </Button>
            <Button size="sm" onClick={handleBaixar} disabled={!state.xml}>
              <Download className="h-4 w-4 mr-1" /> Baixar XML
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto bg-muted/30">
          {state.loading || !state.xml ? (
            <div className="flex items-center justify-center h-full"><Spinner /></div>
          ) : (
            <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all leading-relaxed text-foreground">
              {xmlFormatado}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
