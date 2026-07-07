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

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function hasVisibleInk(canvas: HTMLCanvasElement): boolean {
  const context = canvas.getContext("2d");
  if (!context || canvas.width === 0 || canvas.height === 0) return false;

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const step = Math.max(4, Math.floor(imageData.length / 8000 / 4) * 4);
  let visiblePixels = 0;

  for (let index = 0; index < imageData.length; index += step) {
    const red = imageData[index];
    const green = imageData[index + 1];
    const blue = imageData[index + 2];
    const alpha = imageData[index + 3];

    if (alpha > 0 && (red < 245 || green < 245 || blue < 245)) {
      visiblePixels += 1;
      if (visiblePixels > 8) return true;
    }
  }

  return false;
}

export function PdfViewer({ pdfData, errorMessage: customErrorMessage, onRenderComplete }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTokenRef = useRef(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => setContainerWidth(Math.floor(container.clientWidth));
    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdfData || !containerRef.current || containerWidth <= 0) return;

    const token = renderTokenRef.current + 1;
    renderTokenRef.current = token;
    let cancelled = false;

    const renderPages = async (disableFontFace: boolean): Promise<HTMLCanvasElement[]> => {
      const container = containerRef.current;
      if (!container) return [];

      const pdf = await pdfjsLib.getDocument({
        data: pdfData.slice(),
        disableFontFace,
      }).promise;

      const canvases: HTMLCanvasElement[] = [];

      try {
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled || renderTokenRef.current !== token) return [];

          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
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

          await page.render({ canvas, canvasContext: context, viewport }).promise;
          canvases.push(canvas);
        }
      } finally {
        await pdf.destroy();
      }

      return canvases;
    };

    const renderPdf = async () => {
      setIsRendering(true);
      setErrorMessage(null);

      const container = containerRef.current;
      if (!container) return;

      container.replaceChildren();

      try {
        await waitForNextPaint();

        let canvases = await renderPages(false);
        const hasInk = canvases.some(hasVisibleInk);

        if (!hasInk && canvases.length > 0) {
          canvases = await renderPages(true);
        }

        if (!canvases.some(hasVisibleInk)) {
          throw new Error("O PDF foi gerado, mas a página renderizada não possui conteúdo visível.");
        }

        const fragment = document.createDocumentFragment();
        canvases.forEach((canvas) => fragment.appendChild(canvas));
        container.replaceChildren(fragment);
        
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
  }, [pdfData, containerWidth, onRenderComplete]);

  const showLoading = isRendering || (!!pdfData && containerWidth <= 0 && !errorMessage);

  return (
    <div className="relative h-full w-full overflow-auto bg-muted/40 p-4">
      {showLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
           <div className="rounded-full bg-background/90 p-4 shadow-lg">
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
