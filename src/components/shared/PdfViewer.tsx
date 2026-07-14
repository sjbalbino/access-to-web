import { useEffect, useRef, useState } from "react";
import "@/lib/pdfjsPolyfills";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { AlertCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

type PdfJsLib = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfJsPromise: Promise<PdfJsLib> | null = null;
const STANDARD_FONT_DATA_URL = "/pdfjs/standard_fonts/";

async function loadPdfJs(): Promise<PdfJsLib> {
  if (!pdfJsPromise) {
    pdfJsPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return pdfjsLib;
    });
  }

  return pdfJsPromise;
}

export interface PdfViewerProps {
  pdfData: Uint8Array | null;
  errorMessage?: string;
  onRenderComplete?: () => void;
  forceVisibleTextLayer?: boolean;
}

interface RenderedPage {
  element: HTMLDivElement;
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function PdfViewer({ pdfData, errorMessage: customErrorMessage, onRenderComplete, forceVisibleTextLayer = false }: PdfViewerProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTokenRef = useRef(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let rafId = 0;
    let cancelled = false;

    const updateWidth = () => {
      const nextWidth = Math.floor(viewport.clientWidth);
      setViewportWidth((currentWidth) => {
        if (nextWidth <= 0) return currentWidth;
        if (currentWidth > 0 && Math.abs(nextWidth - currentWidth) < 24) return currentWidth;
        return nextWidth;
      });
      // Keep polling until we get a real width (Dialog open animation can start at 0)
      if (nextWidth <= 0 && !cancelled) {
        rafId = requestAnimationFrame(updateWidth);
      }
    };
    updateWidth();

    const onResize = () => updateWidth();
    window.addEventListener("resize", onResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateWidth);
      observer.observe(viewport);
    }

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!pdfData || !containerRef.current || viewportWidth <= 0) return;

    const token = renderTokenRef.current + 1;
    renderTokenRef.current = token;
    let cancelled = false;

    const renderPages = async (disableFontFace: boolean): Promise<RenderedPage[]> => {
      const container = containerRef.current;
      if (!container) return [];

      const pdfjsLib = await loadPdfJs();

      const pdf = await pdfjsLib.getDocument({
        data: pdfData.slice(),
        disableFontFace,
        standardFontDataUrl: STANDARD_FONT_DATA_URL,
        useSystemFonts: true,
      }).promise;

      const renderedPages: RenderedPage[] = [];

      try {
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled || renderTokenRef.current !== token) return [];

          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const availableWidth = Math.max(viewportWidth - 32, 320);
          const scale = Math.min(availableWidth / baseViewport.width, 2.0);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Não foi possível inicializar a renderização do PDF.");

          const pageWrapper = document.createElement("div");
          pageWrapper.className = "relative mx-auto mb-4 rounded-sm bg-background shadow-md border border-border overflow-hidden";
          pageWrapper.style.width = `${Math.floor(viewport.width)}px`;
          pageWrapper.style.height = `${Math.floor(viewport.height)}px`;
          pageWrapper.style.setProperty("--total-scale-factor", String(scale));

          const pixelRatio = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * pixelRatio);
          canvas.height = Math.floor(viewport.height * pixelRatio);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className = "absolute inset-0 block bg-background";

          context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

          await page.render({ canvas, canvasContext: context, viewport }).promise;

          const textLayer = document.createElement("div");
          textLayer.className = forceVisibleTextLayer ? "pdf-text-layer pdf-text-layer-visible" : "pdf-text-layer";
          textLayer.style.width = `${Math.floor(viewport.width)}px`;
          textLayer.style.height = `${Math.floor(viewport.height)}px`;

          pageWrapper.append(canvas, textLayer);

          try {
            const textContent = await page.getTextContent({
              includeMarkedContent: true,
              disableNormalization: true,
            });
            const textLayerRenderer = new pdfjsLib.TextLayer({
              textContentSource: textContent,
              container: textLayer,
              viewport,
            });
            await textLayerRenderer.render();
          } catch (textLayerError) {
            console.warn("Falha ao renderizar camada de texto do PDF; mantendo canvas.", textLayerError);
          }

          renderedPages.push({ element: pageWrapper });
        }
      } finally {
        await pdf.cleanup(true);
      }

      return renderedPages;
    };

    const renderPdf = async () => {
      const container = containerRef.current;
      if (!container) return;

      setIsRendering(!container.hasChildNodes());
      setErrorMessage(null);

      try {
        await waitForNextPaint();

        let renderedPages: RenderedPage[] = [];

        try {
          renderedPages = await renderPages(false);
        } catch (fontError) {
          if (cancelled || renderTokenRef.current !== token) return;
          console.warn("Falha ao renderizar PDF com fontes do navegador; tentando renderização interna.", fontError);
          renderedPages = await renderPages(true);
        }

        if (renderedPages.length === 0) {
          throw new Error("O PDF foi gerado, mas nenhuma página foi renderizada.");
        }

        const fragment = document.createDocumentFragment();
        renderedPages.forEach((page) => fragment.appendChild(page.element));
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
  }, [pdfData, viewportWidth, onRenderComplete, forceVisibleTextLayer]);

  const showLoading = isRendering || (!!pdfData && viewportWidth <= 0 && !errorMessage);

  return (
    <div ref={viewportRef} className="relative h-full w-full overflow-auto bg-muted/40 p-4">
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
