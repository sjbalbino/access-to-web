import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, FileSpreadsheet, Loader2, Printer, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { RelatorioPayload } from "@/lib/relatorioViewer";

if (!(Map.prototype as any).getOrInsertComputed) {
  Object.defineProperty(Map.prototype, "getOrInsertComputed", {
    value: function getOrInsertComputed<K, V>(this: Map<K, V>, key: K, callback: (key: K) => V) {
      if (!this.has(key)) this.set(key, callback(key));
      return this.get(key);
    },
  });
}

if (!(Map.prototype as any).getOrInsert) {
  Object.defineProperty(Map.prototype, "getOrInsert", {
    value: function getOrInsert<K, V>(this: Map<K, V>, key: K, value: V) {
      if (!this.has(key)) this.set(key, value);
      return this.get(key);
    },
  });
}

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface Props {
  payload: RelatorioPayload | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreviewRelatorioDialog({ payload, open, onOpenChange }: Props) {
  const renderTokenRef = useRef(0);
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pdfBlob = useMemo(() => {
    if (!payload) return null;
    return payload.doc.output("blob");
  }, [payload]);

  const pdfData = useMemo(() => {
    if (!payload) return null;
    return new Uint8Array(payload.doc.output("arraybuffer"));
  }, [payload]);

  useEffect(() => {
    if (!open || !pdfData || !containerElement) return;

    const token = renderTokenRef.current + 1;
    renderTokenRef.current = token;
    let cancelled = false;

    const renderPdf = async () => {
      setIsRendering(true);
      setErrorMessage(null);

      containerElement.replaceChildren();

      try {
        const pdf = await pdfjsLib.getDocument({ data: pdfData.slice() }).promise;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled || renderTokenRef.current !== token) return;

          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const availableWidth = Math.max(containerElement.clientWidth - 32, 320);
          const scale = Math.min(availableWidth / baseViewport.width, 1.6);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Não foi possível inicializar a renderização do PDF.");

          const pixelRatio = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * pixelRatio);
          canvas.height = Math.floor(viewport.height * pixelRatio);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className = "mx-auto mb-4 rounded-sm bg-background shadow-sm";

          context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
          containerElement.appendChild(canvas);

          await page.render({ canvas, canvasContext: context, viewport }).promise;
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Erro desconhecido ao renderizar PDF.");
        }
      } finally {
        if (!cancelled && renderTokenRef.current === token) setIsRendering(false);
      }
    };

    void renderPdf();

    return () => {
      cancelled = true;
    };
  }, [open, pdfData, containerElement]);


  const handleBaixarPdf = () => {
    if (!payload || !pdfBlob) return;
    try {
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = payload.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast({
        title: "Erro ao baixar",
        description: "Se o download foi bloqueado, permita downloads deste site nas configurações do Chrome.",
        variant: "destructive",
      });
    }
  };

  const handleImprimir = () => {
    if (!pdfBlob) return;
    try {
      const url = URL.createObjectURL(pdfBlob);
      const frame = document.createElement("iframe");
      frame.style.position = "fixed";
      frame.style.right = "0";
      frame.style.bottom = "0";
      frame.style.width = "0";
      frame.style.height = "0";
      frame.style.border = "0";
      frame.src = url;
      frame.onload = () => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(frame);
          URL.revokeObjectURL(url);
        }, 1000);
      };
      document.body.appendChild(frame);
    } catch {
      toast({
        title: "Não foi possível imprimir",
        description: "Baixe o PDF e imprima pelo visualizador do sistema.",
        variant: "destructive",
      });
    }
  };


  const handleExportarExcel = () => {
    if (!payload) return;
    if (!payload.sheets || payload.sheets.length === 0) {
      toast({
        title: "Exportação Excel indisponível",
        description: "Este relatório não possui estrutura tabular para Excel. Use Baixar PDF.",
      });
      return;
    }
    try {
      const wb = XLSX.utils.book_new();
      payload.sheets.forEach((s, idx) => {
        const aoa = [s.header, ...s.rows.map((r) => r.map((c) => (c ?? "") as string | number))];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const name = (s.name || `Planilha ${idx + 1}`).substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, name);
      });
      const xlsxName = payload.filename.replace(/\.pdf$/i, "") + ".xlsx";
      XLSX.writeFile(wb, xlsxName);
    } catch (err) {
      toast({
        title: "Erro ao exportar Excel",
        description: err instanceof Error ? err.message : "Falha desconhecida",
        variant: "destructive",
      });
    }
  };

  const temExcel = !!payload?.sheets && payload.sheets.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base truncate">
            Prévia: {payload?.filename ?? "Relatório"}
          </DialogTitle>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={handleImprimir}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportarExcel}
              disabled={!temExcel}
              title={temExcel ? "Exportar para Excel" : "Excel não disponível para este relatório"}
            >
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
            </Button>
            <Button size="sm" onClick={handleBaixarPdf}>
              <Download className="h-4 w-4 mr-1" /> Baixar PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="relative flex-1 overflow-auto bg-muted/30 p-4">
          {isRendering && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {errorMessage ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p>Não foi possível renderizar a prévia do relatório.</p>
              <p className="max-w-md break-words text-xs">{errorMessage}</p>
            </div>
          ) : (
            <div ref={setContainerElement} className="min-h-full" aria-label="Prévia do relatório renderizada" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
