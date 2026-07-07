import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Printer, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { RelatorioPayload, RelatorioSheet } from "@/lib/relatorioViewer";

interface Props {
  payload: RelatorioPayload | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/;

function formatPreviewValue(value: string | number | null | undefined, header?: string): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string") {
    const m = value.match(ISO_DATE_RE);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  if (typeof value === "number") {
    const isInteger = header ? /\bkg\b|saca|sacos|qtd|quantidade/i.test(header) : false;
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: isInteger ? 0 : 2,
    }).format(value);
  }
  return value;
}

function isNumericColumn(header: string): boolean {
  return /kg|saca|sacos|qtd|quantidade|peso|valor|total|saldo|taxa|%|r\$|preço|preco/i.test(header);
}

interface ReportSheetPreviewProps {
  sheet: RelatorioSheet;
}

function ReportSheetPreview({ sheet }: ReportSheetPreviewProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{sheet.name}</h3>
      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full min-w-max border-collapse text-xs">
          <thead className="bg-muted">
            <tr>
              {sheet.header.map((header) => (
                <th
                  key={header}
                  className="border-b px-3 py-2 text-left font-semibold text-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.length > 0 ? (
              sheet.rows.map((row, rowIndex) => {
                const firstCell = row[0];
                const isTotalRow = typeof firstCell === "string" && /^(total|subtotal|resumo)/i.test(firstCell.trim());
                return (
                  <tr
                    key={`${sheet.name}-${rowIndex}`}
                    className={isTotalRow ? "bg-muted font-semibold" : "even:bg-muted/40"}
                  >
                    {sheet.header.map((header, columnIndex) => (
                      <td
                        key={`${sheet.name}-${rowIndex}-${header}`}
                        className={isNumericColumn(header) ? "border-b px-3 py-2 text-right" : "border-b px-3 py-2 text-left"}
                      >
                        {formatPreviewValue(row[columnIndex], header)}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-3 py-4 text-center text-muted-foreground" colSpan={sheet.header.length}>
                  Sem movimentações nesta seção.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PreviewRelatorioDialog({ payload, onOpenChange, open }: Props) {
  const sheets = payload?.sheets ?? [];

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
        
        <div className="relative flex-1 overflow-auto bg-muted/30 p-6">
          <div className="mx-auto min-h-full max-w-5xl rounded-md border bg-card p-6 shadow-sm">
            <div className="mb-6 border-b pb-4">
              <h2 className="text-lg font-semibold text-foreground">{payload?.filename?.replace(/\.pdf$/i, "") ?? "Relatório"}</h2>
              <p className="text-xs text-muted-foreground">Prévia em tela dos dados que serão exportados no PDF.</p>
            </div>

            {sheets.length > 0 ? (
              <div className="space-y-8">
                {sheets.map((sheet) => (
                  <ReportSheetPreview key={sheet.name} sheet={sheet} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-80 items-center justify-center text-center text-sm text-muted-foreground">
                Este relatório não possui dados tabulares para prévia em tela. Use Baixar PDF para visualizar o arquivo completo.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
