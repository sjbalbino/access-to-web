import { useEffect, useRef, useState } from "react";
import "@/lib/pdfjsPolyfills";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { AlertCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PdfViewerProps {
  pdfData: Uint8Array | null;
  errorMessage?: string;
  onRenderComplete?: () => void;
}

export function PdfViewer({ pdfData, errorMessage: customErrorMessage, onRenderComplete }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTokenRef = useRef(0);
  const [isRendering, setIsRendering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfData || !containerRef.current) return;

    const token = renderTokenRef.current + 1;
    renderTokenRef.current = token;
    let cancelled = false;

    const renderPdf = async () => {
      setIsRendering(true);
      setErrorMessage(null);

      const container = containerRef.current;
      if (!container) return;

      container.replaceChildren();

      try {
        const pdf = await pdfjsLib.getDocument({ data: pdfData.slice() }).promise;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled || renderTokenRef.current !== token) return;

          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          // Adjust width based on container, but keep a reasonable minimum
          const availableWidth = Math.max(container.clientWidth - 32, 320);
          const scale = Math.min(availableWidth / baseViewport.width, 2.0);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Não foi possível inicializar a renderização do PDF.");

          const pixelRatio = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * pixelRatio);
          canvas.height = Math.floor(viewport.height * pixelRatio);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className = "mx-auto mb-4 rounded-sm bg-background shadow-md border border-border block";

          context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
          container.appendChild(canvas);

          await page.render({ canvas, canvasContext: context, viewport }).promise;
        }
        
        if (!cancelled && renderTokenRef.current === token) {
          onRenderComplete?.();
        }
      } catch (error) {
        if (!cancelled) {
          console.error("PDF Render Error:", error);
          const message = error instanceof Error ? error.message : "Erro desconhecido ao renderizar PDF.";
          setErrorMessage(message);
        }
      } finally {
        if (!cancelled && renderTokenRef.current === token) {
          setIsRendering(false);
        }
      }
    };

    void renderPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfData, onRenderComplete]);

  return (
    <div className="relative h-full w-full overflow-auto bg-muted/40 p-4">
      {isRendering && (
        <div className="sticky top-0 left-0 right-0 z-10 flex h-0 items-center justify-center">
           <div className="mt-20 bg-background/80 p-4 rounded-full shadow-lg">
             <Spinner />
           </div>
        </div>
      )}

      {errorMessage ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <p>{customErrorMessage || "Não foi possível renderizar o PDF."}</p>
          <p className="max-w-md break-words text-xs">{errorMessage}</p>
        </div>
      ) : (
        <div ref={containerRef} className="min-h-full w-full" aria-label="PDF renderizado" />
      )}
    </div>
  );
}
