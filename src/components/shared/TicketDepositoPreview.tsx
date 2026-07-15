import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, Printer, Download } from "lucide-react";
import "@/lib/pdfjsPolyfills";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

type PdfJsLib = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfJsPromise: Promise<PdfJsLib> | null = null;

async function loadPdfJs(): Promise<PdfJsLib> {
  if (!pdfJsPromise) {
    pdfJsPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return lib;
    });
  }
  return pdfJsPromise;
}

export interface TicketDepositoPreviewPayload {
  pdfData: Uint8Array;
  filename: string;
}

const EVENT_NAME = "ticket-deposito-preview";

export function openTicketDepositoPreview(payload: TicketDepositoPreviewPayload) {
  window.dispatchEvent(new CustomEvent<TicketDepositoPreviewPayload>(EVENT_NAME, { detail: payload }));
}

export function TicketDepositoPreview() {
  const [payload, setPayload] = useState<TicketDepositoPreviewPayload | null>(null);
  const [open, setOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<TicketDepositoPreviewPayload>).detail;
      setPayload(detail);
      setOpen(true);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  useEffect(() => {
    if (!open || !payload) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setImgUrl(null);

    (async () => {
      try {
        const pdfjsLib = await loadPdfJs();
        const pdf = await pdfjsLib.getDocument({ data: payload.pdfData.slice() }).promise;
        try {
          const page = await pdf.getPage(1);
          const scale = 3;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas indisponível.");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          setImgUrl(canvas.toDataURL("image/png"));
        } finally {
          await pdf.cleanup(true);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Ticket preview error:", err);
          setError(err instanceof Error ? err.message : "Erro ao renderizar ticket.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, payload]);

  useEffect(() => {
    if (!open) {
      setImgUrl(null);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const handlePrint = () => {
    if (!payload) return;
    const blob = new Blob([payload.pdfData as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = url;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Print error", err);
      }
    };
    document.body.appendChild(iframe);
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 60000);
  };

  const handleDownload = () => {
    if (!payload) return;
    const blob = new Blob([payload.pdfData as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = payload.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Ticket de Depósito</DialogTitle>
          <DialogDescription className="sr-only">
            Pré-visualização do ticket de depósito.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto bg-muted/40 p-4">
          {loading && (
            <div className="h-full w-full flex items-center justify-center">
              <Spinner />
            </div>
          )}
          {!loading && error && (
            <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p>Não foi possível renderizar o ticket.</p>
              <p className="max-w-md break-words text-xs">{error}</p>
            </div>
          )}
          {!loading && !error && imgUrl && (
            <img
              src={imgUrl}
              alt="Ticket de Depósito"
              className="mx-auto max-w-full h-auto shadow-md border border-border bg-background"
            />
          )}
        </div>
        <DialogFooter className="p-4 border-t gap-2 sm:justify-end">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Baixar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
