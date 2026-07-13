import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Printer, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { RelatorioPayload } from "@/lib/relatorioViewer";

interface Props {
  payload: RelatorioPayload | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreviewRelatorioDialog({ payload, onOpenChange, open }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !payload) {
      setPdfUrl(null);
      return;
    }
    let url: string | null = null;
    try {
      const blob = payload.doc.output("blob");
      url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      console.error("Erro ao gerar PDF para preview:", err);
      setPdfUrl(null);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, payload]);


  const handleBaixarPdf = () => {
    if (!payload) return;
    try {
      payload.doc.save(payload.filename);
    } catch {
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

        <div className="flex-1 min-h-0 bg-muted/30">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="Prévia do relatório"
              className="h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Gerando prévia...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
