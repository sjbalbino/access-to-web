import { useEffect, useState } from "react";
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
  /** Aceito por compatibilidade — ignorado nesta versão (sem text layer). */
  forceVisibleTextLayer?: boolean;
}

export function PdfViewer({ pdfData, errorMessage: customErrorMessage, onRenderComplete }: PdfViewerProps) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfData) {
      setImages([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setImages([]);

    (async () => {
      try {
        const pdfjsLib = await loadPdfJs();
        const pdf = await pdfjsLib.getDocument({
          data: pdfData.slice(),
          standardFontDataUrl: STANDARD_FONT_DATA_URL,
          useSystemFonts: true,
        }).promise;

        const rendered: string[] = [];
        try {
          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            if (cancelled) return;
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 2 });

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Não foi possível inicializar a renderização do PDF.");

            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);

            await page.render({ canvas, canvasContext: context, viewport }).promise;

            const dataUrl = canvas.toDataURL("image/png");
            rendered.push(dataUrl);

            // Libera o canvas
            canvas.width = 0;
            canvas.height = 0;

            if (cancelled) return;
            setImages([...rendered]);
          }
        } finally {
          await pdf.cleanup(true);
        }

        if (!cancelled) {
          setLoading(false);
          onRenderComplete?.();
        }
      } catch (err) {
        if (cancelled) return;
        console.error("PDF Render Error:", err);
        setError(err instanceof Error ? err.message : "Erro desconhecido ao renderizar PDF.");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfData, onRenderComplete]);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/40 p-4 text-center text-sm text-muted-foreground">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p>{customErrorMessage || "Não foi possível renderizar o PDF."}</p>
        <p className="max-w-md break-words text-xs">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-auto bg-muted/40 p-4">
      {loading && images.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
          <div className="rounded-full bg-background/90 p-4 shadow-lg">
            <Spinner />
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full flex-col items-center gap-4">
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Página ${i + 1}`}
            className="block max-w-full rounded-sm border border-border bg-background shadow-md"
          />
        ))}
      </div>
    </div>
  );
}
