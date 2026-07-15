import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export interface PdfViewerProps {
  pdfData: Uint8Array | null;
  errorMessage?: string;
  onRenderComplete?: () => void;
  /** Aceito por compatibilidade — ignorado nesta versão (viewer nativo do navegador). */
  forceVisibleTextLayer?: boolean;
}

export function PdfViewer({ pdfData, errorMessage: customErrorMessage, onRenderComplete }: PdfViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onRenderCompleteRef = useRef(onRenderComplete);

  useEffect(() => {
    onRenderCompleteRef.current = onRenderComplete;
  }, [onRenderComplete]);

  useEffect(() => {
    if (!pdfData || pdfData.byteLength === 0) {
      setBlobUrl(null);
      setError(null);
      return;
    }

    let url: string | null = null;
    try {
      const copy = pdfData.slice();
      const blob = new Blob([copy], { type: "application/pdf" });
      url = URL.createObjectURL(blob);
      setBlobUrl(url);
      setError(null);
    } catch (err) {
      console.error("[PdfViewer] Falha ao gerar URL do PDF:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido ao preparar PDF.");
      setBlobUrl(null);
    }

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [pdfData]);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/40 p-4 text-center text-sm text-muted-foreground">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p>{customErrorMessage || "Não foi possível exibir o PDF."}</p>
        <p className="max-w-md break-words text-xs">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-muted/40">
      {!blobUrl && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
          <div className="rounded-full bg-background/90 p-4 shadow-lg">
            <Spinner />
          </div>
        </div>
      )}

      {blobUrl && (
        <iframe
          key={blobUrl}
          src={`${blobUrl}#toolbar=1&navpanes=0`}
          title="Prévia do PDF"
          className="h-full w-full border-0 bg-background"
          onLoad={() => onRenderCompleteRef.current?.()}
        />
      )}
    </div>
  );
}
