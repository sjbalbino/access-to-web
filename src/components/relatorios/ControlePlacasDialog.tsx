import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSafras } from "@/hooks/useSafras";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ComboboxFilter } from "@/components/ui/combobox-filter";
import { toast } from "sonner";
import {
  exportarPlacasExcel, gerarExtratoPlacaPdf, gerarResumoPlacasPdf,
  type PlacaMovimento, type PlacasFiltroInfo,
} from "@/lib/controlePlacasRelatorio";

export interface ControlePlacasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ColheitaRow {
  data_colheita: string | null; romaneio: number | null;
  peso_bruto: number | null; peso_tara: number | null; producao_kg: number | null; kg_desconto_total: number | null; producao_liquida_kg: number | null;
  placas: { placa: string; propriedade: string | null } | null;
  controle_lavouras: { lavouras: { nome: string } | null; granjas: { razao_social: string; nome_fantasia: string | null } | null } | null;
  inscricoes_produtor: { inscricao_estadual: string | null; nome: string | null; produtores: { nome: string } | null } | null;
}

/** Busca todas as entradas de colheita com placa da safra (paginado de 1000 em 1000). */
async function buscarMovimentos(safraId: string): Promise<PlacaMovimento[]> {
  const out: PlacaMovimento[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("colheitas")
      .select(`data_colheita, romaneio, peso_bruto, peso_tara, producao_kg, kg_desconto_total, producao_liquida_kg,
        placas!inner(placa, propriedade),
        controle_lavouras(lavouras(nome), granjas(razao_social, nome_fantasia)),
        inscricoes_produtor(inscricao_estadual, nome, produtores(nome))`)
      .eq("safra_id", safraId)
      .not("placa_id", "is", null)
      .range(from, from + 999);
    if (error) throw error;
    for (const r of (data ?? []) as unknown as ColheitaRow[]) {
      const g = r.controle_lavouras?.granjas;
      // Bruto da carga = peso do produto na balança (bruto - tara), antes dos descontos.
      // peso_bruto sozinho inclui o caminhão e inflaria os totais.
      const pesoBalanca = r.peso_bruto != null ? Number(r.peso_bruto) - Number(r.peso_tara ?? 0) : 0;
      const bruto = Number(r.producao_kg ?? (pesoBalanca > 0 ? pesoBalanca : 0));
      const descontoBase = Number(r.kg_desconto_total ?? 0);
      const liquido = Number(r.producao_liquida_kg ?? Math.max(bruto - descontoBase, 0));
      out.push({
        placa: (r.placas?.placa ?? "").toUpperCase(),
        propriedade: r.placas?.propriedade ?? null,
        granja: g ? (g.nome_fantasia ? `${g.razao_social} (${g.nome_fantasia})` : g.razao_social) : "Sem granja",
        lavoura: r.controle_lavouras?.lavouras?.nome ?? "Sem lavoura",
        data: r.data_colheita, romaneio: r.romaneio,
        bruto, desconto: Number(r.kg_desconto_total ?? Math.max(bruto - liquido, 0)), liquido,
        inscricao: (r.inscricoes_produtor?.inscricao_estadual ?? "").toUpperCase(),
        produtor: (r.inscricoes_produtor?.produtores?.nome ?? r.inscricoes_produtor?.nome ?? "").toUpperCase(),
      });
    }
    if (!data || data.length < 1000) break;
  }
  return out;
}

export function ControlePlacasDialog({ open, onOpenChange }: ControlePlacasDialogProps) {
  const { data: safras = [] } = useSafras();
  const [safraId, setSafraId] = useState("");
  const [placa, setPlaca] = useState("");
  const [lavoura, setLavoura] = useState("");

  const { data: movs = [], isFetching } = useQuery({
    queryKey: ["controle-placas", safraId],
    queryFn: () => buscarMovimentos(safraId),
    enabled: open && !!safraId,
    staleTime: 60_000,
  });

  const placasOpts = useMemo(() => [...new Set(movs.map((m) => m.placa))].sort().map((p) => ({ value: p, label: p })), [movs]);
  const lavourasOpts = useMemo(() => [...new Set(movs.filter((m) => !placa || m.placa === placa).map((m) => m.lavoura))].sort().map((l) => ({ value: l, label: l })), [movs, placa]);
  const filtrados = useMemo(() => movs.filter((m) => (!placa || m.placa === placa) && (!lavoura || m.lavoura === lavoura)), [movs, placa, lavoura]);

  const safra = safras.find((s) => s.id === safraId) as { nome: string; culturas?: { nome: string } | null } | undefined;
  const info: PlacasFiltroInfo = { safra: safra?.nome ?? "", cultura: safra?.culturas?.nome ?? "", placa: placa || undefined, lavoura: lavoura || undefined };

  const executar = (fn: () => void) => {
    if (!filtrados.length) { toast.error("Nenhuma entrada com placa para os filtros selecionados."); return; }
    try { fn(); } catch (e) { toast.error(`Erro ao gerar relatório: ${(e as Error).message}`); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Controle de Placas de Depósitos</DialogTitle>
          <DialogDescription>Caminhões que transportaram os depósitos da safra.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Safra</Label>
            <ComboboxFilter value={safraId} onValueChange={(v) => { setSafraId(v); setPlaca(""); setLavoura(""); }}
              options={safras.map((s) => ({ value: s.id, label: s.nome }))} placeholder="Selecione a safra" allLabel="Selecione" popoverWidth="w-[360px]" className="w-full" />
          </div>
          <div className="space-y-1">
            <Label>Placa</Label>
            <ComboboxFilter value={placa} onValueChange={(v) => { setPlaca(v); setLavoura(""); }} options={placasOpts}
              placeholder="Todas" allLabel="Todas" disabled={!safraId} className="w-full" />
          </div>
          <div className="space-y-1">
            <Label>Lavoura (em branco = todas)</Label>
            <ComboboxFilter value={lavoura} onValueChange={setLavoura} options={lavourasOpts}
              placeholder="Todas" allLabel="Todas" disabled={!safraId} className="w-full" />
          </div>
          <p className="text-sm text-muted-foreground">
            {isFetching ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Carregando…</span>
              : safraId ? `${filtrados.length} cargas encontradas` : "Selecione uma safra."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button disabled={isFetching || !safraId} onClick={() => executar(() => gerarExtratoPlacaPdf(filtrados, info))}><FileText className="h-4 w-4 mr-2" />Extrato da Placa</Button>
            <Button variant="outline" disabled={isFetching || !safraId} onClick={() => executar(() => gerarResumoPlacasPdf(filtrados, info, true))}><FileText className="h-4 w-4 mr-2" />Resumo por Granja</Button>
            <Button variant="outline" disabled={isFetching || !safraId} onClick={() => executar(() => gerarResumoPlacasPdf(filtrados, info, false))}><FileText className="h-4 w-4 mr-2" />Resumo Geral</Button>
            <Button variant="secondary" disabled={isFetching || !safraId} onClick={() => executar(() => exportarPlacasExcel(filtrados, info))}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
