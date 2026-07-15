import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

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
    if (!open || !payload) {
      return;
    }
    const blob = new Blob([payload.pdfData as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setBlobUrl(null);
    };
  }, [open, payload]);

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
            Pré-visualização do ticket de depósito em PDF.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 bg-muted">
          {blobUrl ? (
            <iframe
              src={blobUrl}
              title="Ticket de Depósito"
              className="h-full w-full border-0"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
              Carregando ticket...
            </div>
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
