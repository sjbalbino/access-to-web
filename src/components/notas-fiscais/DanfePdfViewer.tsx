import { useEffect, useState } from "react";
import { Download, ExternalLink, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/shared/PdfViewer";
import { useIsMobile } from "@/hooks/use-mobile";

export interface DanfePdfViewerProps {
  pdfData: Uint8Array | null;
  /** URL de blob já pronta (opcional) — usada no fallback mobile */
  downloadUrl?: string | null;
  filename?: string;
}

/**
 * No desktop renderiza o PDF em iframe.
 * Em smartphones o iframe de PDF é bloqueado/ignorado pelos navegadores móveis,
 * então oferecemos abrir em nova aba (viewer nativo) ou baixar o arquivo.
 */
export function DanfePdfViewer({ pdfData, downloadUrl, filename = "danfe.pdf" }: DanfePdfViewerProps) {
  const isMobile = useIsMobile();
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (downloadUrl || !pdfData || pdfData.byteLength === 0) {
      setLocalUrl(null);
      return;
    }
    let url: string | null = null;
    try {
      const blob = new Blob([pdfData.slice()], { type: "application/pdf" });
      url = URL.createObjectURL(blob);
      setLocalUrl(url);
    } catch (err) {
      console.error("[DanfePdfViewer] Falha ao preparar PDF:", err);
      setLocalUrl(null);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [pdfData, downloadUrl]);

  if (isMobile) {
    const url = downloadUrl || localUrl;
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
        <FileSearch className="h-10 w-10 text-primary" />
        <p className="text-sm text-muted-foreground">
          No celular a DANFE abre no visualizador de PDF do aparelho.
        </p>
        <div className="flex w-full flex-col gap-2">
          <Button
            className="h-11 w-full"
            disabled={!url}
            onClick={() => {
              if (url) window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" /> Abrir DANFE
          </Button>
          <Button variant="outline" className="h-11 w-full" asChild disabled={!url}>
            <a href={url ?? "#"} download={filename}>
              <Download className="h-4 w-4 mr-2" /> Baixar PDF
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PdfViewer
      pdfData={pdfData}
      errorMessage="Não foi possível renderizar a DANFE no preview."
    />
  );
}
