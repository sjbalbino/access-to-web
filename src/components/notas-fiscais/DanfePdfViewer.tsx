import { PdfViewer } from "@/components/shared/PdfViewer";

export interface DanfePdfViewerProps {
  pdfData: Uint8Array | null;
}

export function DanfePdfViewer({ pdfData }: DanfePdfViewerProps) {
  return (
    <PdfViewer 
      pdfData={pdfData} 
      errorMessage="Não foi possível renderizar a DANFE no preview."
    />
  );
}
