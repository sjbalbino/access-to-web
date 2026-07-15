import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

export interface TicketDepositoPreviewPayload {
  pdfData: Uint8Array;
  filename: string;
  previewText: string;
}

const EVENT_NAME = "ticket-deposito-preview";

export function openTicketDepositoPreview(payload: TicketDepositoPreviewPayload) {
  window.dispatchEvent(new CustomEvent<TicketDepositoPreviewPayload>(EVENT_NAME, { detail: payload }));
}

export function TicketDepositoPreview() {
  const [payload, setPayload] = useState<TicketDepositoPreviewPayload | null>(null);
  const [open, setOpen] = useState(false);

  const previewText = useMemo(() => payload?.previewText || "Prévia do ticket indisponível.", [payload]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<TicketDepositoPreviewPayload>).detail;
      setPayload(detail);
      setOpen(true);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const handlePrint = () => {
    if (!payload) return;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.srcdoc = `<!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(payload.filename)}</title>
          <style>
            @page { size: 80mm auto; margin: 3mm; }
            body { margin: 0; background: #fff; color: #000; }
            pre { margin: 0; font-family: "Courier New", monospace; font-size: 8pt; line-height: 1.35; white-space: pre; }
          </style>
        </head>
        <body><pre>${escapeHtml(previewText)}</pre></body>
      </html>`;
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
      iframe.remove();
    }, 1000);
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
          <pre className="mx-auto w-fit min-w-[320px] max-w-full whitespace-pre overflow-x-auto border border-border bg-background p-4 font-mono text-[11px] leading-snug text-foreground shadow-md sm:text-xs">
            {previewText}
          </pre>
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
