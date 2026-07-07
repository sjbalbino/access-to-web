import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, FileSpreadsheet, Printer, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { RelatorioPayload } from "@/lib/relatorioViewer";
import { PdfViewer } from "@/components/shared/PdfViewer";

interface Props {
  payload: RelatorioPayload | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreviewRelatorioDialog({ payload, open, onOpenChange }: Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pdfData = useMemo(() => {
    if (!payload || !open) return null;
    try {
      // Usamos arraybuffer em vez de blob para evitar bloqueios de iframe
      // e permitir renderização direta via pdf.js no Canvas
      return new Uint8Array(payload.doc.output("arraybuffer"));
    } catch (err) {
      console.error("Erro ao gerar arraybuffer do PDF:", err);
      setErrorMessage(err instanceof Error ? err.message : "Erro ao gerar PDF.");
      return null;
    }
  }, [payload, open]);

  const handleBaixarPdf = () => {
    if (!payload) return;
    try {
      payload.doc.save(payload.filename);
    } catch (err) {
      toast({
        title: "Erro ao baixar",
        description: "Não foi possível gerar o arquivo para download.",
        variant: "destructive",
      });
    }
  };

  const handleImprimir = () => {
    if (!payload) return;
    try {
      // Para impressão, ainda precisamos de um blob temporário
      const blob = payload.doc.output("blob");
      const url = URL.createObjectURL(blob);
      const frame = document.createElement("iframe");
      frame.style.position = "fixed";
      frame.style.right = "0";
      frame.style.bottom = "0";
      frame.style.width = "0";
      frame.style.height = "0";
      frame.style.border = "0";
      frame.src = url;
      frame.onload = () => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(frame);
          URL.revokeObjectURL(url);
        }, 1000);
      };
      document.body.appendChild(frame);
    } catch {
      toast({
        title: "Não foi possível imprimir",
        description: "Baixe o PDF e imprima pelo visualizador do sistema.",
        variant: "destructive",
      });
    }
  };

  const handleExportarExcel = () => {
    if (!payload) return;
    if (!payload.sheets || payload.sheets.length === 0) {
      toast({
        title: "Exportação Excel indisponível",
        description: "Este relatório não possui estrutura tabular para Excel. Use Baixar PDF.",
      });
      return;
    }
    try {
      const wb = XLSX.utils.book_new();
      payload.sheets.forEach((s, idx) => {
        const aoa = [s.header, ...s.rows.map((r) => r.map((c) => (c ?? "") as string | number))];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const name = (s.name || `Planilha ${idx + 1}`).substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, name);
      });
      const xlsxName = payload.filename.replace(/\.pdf$/i, "") + ".xlsx";
      XLSX.writeFile(wb, xlsxName);
    } catch (err) {
      toast({
        title: "Erro ao exportar Excel",
        description: err instanceof Error ? err.message : "Falha desconhecida",
        variant: "destructive",
      });
    }
  };

  const temExcel = !!payload?.sheets && payload.sheets.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base truncate">
            Prévia: {payload?.filename ?? "Relatório"}
          </DialogTitle>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={handleImprimir}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportarExcel}
              disabled={!temExcel}
              title={temExcel ? "Exportar para Excel" : "Excel não disponível para este relatório"}
            >
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
            </Button>
            <Button size="sm" onClick={handleBaixarPdf}>
              <Download className="h-4 w-4 mr-1" /> Baixar PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="relative flex-1 overflow-hidden bg-muted/30">
          {errorMessage ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p>Não foi possível gerar a prévia do relatório.</p>
              <p className="max-w-md break-words text-xs">{errorMessage}</p>
            </div>
          ) : pdfData ? (
            <PdfViewer 
              pdfData={pdfData} 
              errorMessage="Não foi possível renderizar a prévia do relatório."
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Carregando prévia...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
