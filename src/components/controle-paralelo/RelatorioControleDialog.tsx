import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { useSafras } from "@/hooks/useSafras";
import { loadPdfBrand } from "@/lib/pdfBrand";
import { captureNextRelatorio, cancelPendingCapture, type RelatorioPayload } from "@/lib/relatorioViewer";
import { PreviewRelatorioDialog } from "@/components/relatorios/PreviewRelatorioDialog";
import {
  carregarDocumentos,
  labelTipo,
  TIPOS_RELATORIO,
  useControleMarcacoes,
  type DocumentoControle,
  type DocumentoTipo,
  type DocumentoTipoMarcavel,
} from "@/hooks/useControleParalelo";

import {
  gerarConsolidadoControlePdf,
  gerarRelatorioControlePdf,
  type Orientacao,
  type TamanhoPagina,
} from "@/lib/relatoriosControleParalelo";

export interface RelatorioControleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conjuntoId: string;
  conjuntoNome: string;
}

type Escopo = DocumentoTipo | "consolidado";

export function RelatorioControleDialog({
  open,
  onOpenChange,
  conjuntoId,
  conjuntoNome,
}: RelatorioControleDialogProps) {
  const [escopo, setEscopo] = useState<Escopo>("consolidado");
  const [safraId, setSafraId] = useState<string | undefined>(undefined);
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  
  const [orientacao, setOrientacao] = useState<Orientacao>("landscape");
  const [tamanho, setTamanho] = useState<TamanhoPagina>("a4");
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPayload, setPreviewPayload] = useState<RelatorioPayload | null>(null);

  const { data: safras } = useSafras();
  const { data: marcacoes } = useControleMarcacoes(conjuntoId);

  const gerar = async () => {
    if (dataInicial && dataFinal && dataInicial > dataFinal) {
      toast.error("A data inicial não pode ser maior que a data final.");
      return;
    }

    setLoading(true);
    setPreviewOpen(false);
    setPreviewPayload(null);
    const capture = captureNextRelatorio();

    try {
      await loadPdfBrand();

      const filtros = {
        safraId,
        dataInicial: dataInicial || undefined,
        dataFinal: dataFinal || undefined,
      };

      const somenteMarcados = modo === "somente_marcados";
      const marcadosPorTipo = (tipo: DocumentoTipoMarcavel) =>
        new Set((marcacoes ?? []).filter((m) => m.documento_tipo === tipo).map((m) => m.documento_id));

      // Remessas não são marcáveis: herdam a marcação do contrato de venda.
      const contratosMarcados = marcadosPorTipo("contrato_venda");
      const filtrarDocs = (tipo: DocumentoTipo, docs: DocumentoControle[]): DocumentoControle[] => {
        if (tipo === "remessa_venda") {
          return docs.filter((d) => !(!!d.contrato_id && contratosMarcados.has(d.contrato_id)));
        }
        const marcados = marcadosPorTipo(tipo as DocumentoTipoMarcavel);
        return docs.filter((d) => !marcados.has(d.id));
      };

      const subtitulo = [
        safraId ? `Safra: ${safras?.find((s: any) => s.id === safraId)?.nome ?? "-"}` : "Safra: Todas",
        dataInicial || dataFinal
          ? `Período: ${dataInicial ? dataInicial.split("-").reverse().join("/") : "início"} a ${
              dataFinal ? dataFinal.split("-").reverse().join("/") : "hoje"
            }`
          : "Período: Todos",
      ].join("          ");

      const opcoes = { conjuntoNome, subtitulo, orientacao, tamanho, somenteMarcados };

      if (escopo === "consolidado") {
        const blocos = [];
        for (const t of TIPOS_RELATORIO) {
          const docs = await carregarDocumentos(t.tipo, filtros);
          blocos.push({ tipo: t.tipo, docs: filtrarDocs(t.tipo, docs) });
        }
        gerarConsolidadoControlePdf(blocos, opcoes);
      } else {
        const docs = await carregarDocumentos(escopo, filtros);
        gerarRelatorioControlePdf(escopo, filtrarDocs(escopo, docs), opcoes);
      }


      const payload = await capture;
      setPreviewPayload(payload);
      setPreviewOpen(true);
    } catch (error: any) {
      cancelPendingCapture();
      toast.error("Erro ao gerar relatório: " + (error?.message ?? "desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Relatórios do Controle Gerencial</DialogTitle>
            <DialogDescription>
              Conjunto: <span className="font-medium">{conjuntoNome}</span>. Os lançamentos marcados são
              desconsiderados do relatório (ou listados isoladamente, para conferência).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Relatório</Label>
              <Select value={escopo} onValueChange={(v) => setEscopo(v as Escopo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consolidado">Consolidado (todos os tipos)</SelectItem>
                  {TIPOS_RELATORIO.map((t) => (
                    <SelectItem key={t.tipo} value={t.tipo}>
                      {labelTipo(t.tipo)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Select value={modo} onValueChange={(v) => setModo(v as typeof modo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem_marcados">Desconsiderando os lançamentos marcados</SelectItem>
                  <SelectItem value="somente_marcados">Conferência — somente os marcados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Safra</Label>
              <Select value={safraId} onValueChange={(v) => setSafraId(v === "todas" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as safras" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as safras</SelectItem>
                  {(safras ?? []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rel-data-ini">Data inicial</Label>
                <Input id="rel-data-ini" type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rel-data-fim">Data final</Label>
                <Input id="rel-data-fim" type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Orientação</Label>
                <Select value={orientacao} onValueChange={(v) => setOrientacao(v as Orientacao)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landscape">Paisagem</SelectItem>
                    <SelectItem value="portrait">Retrato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tamanho da página</Label>
                <Select value={tamanho} onValueChange={(v) => setTamanho(v as TamanhoPagina)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a4">A4</SelectItem>
                    <SelectItem value="a3">A3</SelectItem>
                    <SelectItem value="letter">Carta</SelectItem>
                    <SelectItem value="legal">Ofício</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button onClick={gerar} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              Gerar Relatório
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PreviewRelatorioDialog
        payload={previewPayload}
        open={previewOpen}
        onOpenChange={(o) => {
          setPreviewOpen(o);
          if (!o) setPreviewPayload(null);
        }}
      />
    </>
  );
}
