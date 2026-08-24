import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TIPOS_APLICACAO, type TipoAplicacao } from "./useAplicacoes";

/** Uma linha da composição de custos (sementes ou um tipo de aplicação). */
export interface LinhaCustoLavoura {
  chave: string;
  label: string;
  lancamentos: number;
  total: number;
  /** Custo por hectare — null quando não há área base válida. */
  custoHa: number | null;
  /** Participação percentual no custo total (0-100). */
  percentual: number;
}

export interface CustosLavoura {
  controleId: string;
  lavouraNome: string;
  safraNome: string;
  /** Área usada como base de rateio (ha_plantado, com fallback para area_total). */
  areaHa: number | null;
  producaoKg: number;
  sacas: number;
  linhas: LinhaCustoLavoura[];
  custoTotal: number;
  custoHa: number | null;
  custoSaca: number | null;
}

const LABELS_APLICACAO: Record<string, string> = TIPOS_APLICACAO.reduce(
  (acc, t) => ({ ...acc, [t.value]: t.label }),
  {} as Record<string, string>
);

const KG_POR_SACA = 60;

interface AgregarParams {
  controleId: string;
  lavouraNome: string;
  safraNome: string;
  areaTotal: number | null;
  haPlantado: number | null;
  plantios: { valor_total: number | null }[];
  aplicacoes: { tipo: string; valor_total: number | null }[];
  colheitas: { producao_liquida_kg: number | null; producao_kg: number | null }[];
}

/** Agrega plantios + aplicações + colheitas em indicadores de custo. */
export function agregarCustosLavoura(params: AgregarParams): CustosLavoura {
  const areaBase =
    params.haPlantado && params.haPlantado > 0
      ? params.haPlantado
      : params.areaTotal && params.areaTotal > 0
        ? params.areaTotal
        : null;

  const producaoKg = params.colheitas.reduce(
    (soma, c) => soma + (Number(c.producao_liquida_kg ?? c.producao_kg) || 0),
    0
  );
  const sacas = producaoKg / KG_POR_SACA;

  const totalSementes = params.plantios.reduce((soma, p) => soma + (Number(p.valor_total) || 0), 0);

  const porTipo = new Map<string, { total: number; lancamentos: number }>();
  params.aplicacoes.forEach((a) => {
    const atual = porTipo.get(a.tipo) || { total: 0, lancamentos: 0 };
    atual.total += Number(a.valor_total) || 0;
    atual.lancamentos += 1;
    porTipo.set(a.tipo, atual);
  });

  const custoTotal =
    totalSementes + Array.from(porTipo.values()).reduce((soma, v) => soma + v.total, 0);

  const linhasAplicacoes: LinhaCustoLavoura[] = Array.from(porTipo.entries())
    .map(([tipo, v]) => ({
      chave: tipo,
      label: LABELS_APLICACAO[tipo] || tipo,
      lancamentos: v.lancamentos,
      total: v.total,
      custoHa: areaBase ? v.total / areaBase : null,
      percentual: custoTotal > 0 ? (v.total / custoTotal) * 100 : 0,
    }))
    .filter((l) => l.total > 0)
    .sort((a, b) => b.total - a.total);

  const linhas: LinhaCustoLavoura[] = [];
  if (totalSementes > 0) {
    linhas.push({
      chave: "sementes",
      label: "Sementes (Plantio)",
      lancamentos: params.plantios.length,
      total: totalSementes,
      custoHa: areaBase ? totalSementes / areaBase : null,
      percentual: custoTotal > 0 ? (totalSementes / custoTotal) * 100 : 0,
    });
  }
  linhas.push(...linhasAplicacoes);

  return {
    controleId: params.controleId,
    lavouraNome: params.lavouraNome,
    safraNome: params.safraNome,
    areaHa: areaBase,
    producaoKg,
    sacas,
    linhas,
    custoTotal,
    custoHa: areaBase ? custoTotal / areaBase : null,
    custoSaca: sacas > 0 ? custoTotal / sacas : null,
  };
}

/** Custos de um único controle de lavoura (aba Custos). */
export function useCustosLavoura(controleLavouraId: string | null) {
  return useQuery({
    queryKey: ["custos-lavoura", controleLavouraId],
    enabled: !!controleLavouraId,
    queryFn: async (): Promise<CustosLavoura | null> => {
      if (!controleLavouraId) return null;

      const [controleRes, plantiosRes, aplicacoesRes, colheitasRes] = await Promise.all([
        supabase
          .from("controle_lavouras")
          .select("id, area_total, ha_plantado, lavouras:lavoura_id(nome), safras:safra_id(nome)")
          .eq("id", controleLavouraId)
          .maybeSingle(),
        supabase.from("plantios").select("valor_total").eq("controle_lavoura_id", controleLavouraId),
        supabase
          .from("aplicacoes")
          .select("tipo, valor_total")
          .eq("controle_lavoura_id", controleLavouraId),
        supabase
          .from("colheitas")
          .select("producao_liquida_kg, producao_kg")
          .eq("controle_lavoura_id", controleLavouraId),
      ]);

      if (controleRes.error) throw controleRes.error;
      if (plantiosRes.error) throw plantiosRes.error;
      if (aplicacoesRes.error) throw aplicacoesRes.error;
      if (colheitasRes.error) throw colheitasRes.error;

      const controle: any = controleRes.data;
      if (!controle) return null;

      return agregarCustosLavoura({
        controleId: controle.id,
        lavouraNome: controle.lavouras?.nome || "-",
        safraNome: controle.safras?.nome || "-",
        areaTotal: controle.area_total,
        haPlantado: controle.ha_plantado,
        plantios: plantiosRes.data || [],
        aplicacoes: (aplicacoesRes.data || []) as { tipo: TipoAplicacao; valor_total: number | null }[],
        colheitas: colheitasRes.data || [],
      });
    },
  });
}

/** Busca paginada (evita o limite de 1.000 linhas do PostgREST). */
async function fetchAllRows(build: (from: number, to: number) => any): Promise<any[]> {
  const PAGE = 1000;
  const acc: any[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await build(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    const rows = data || [];
    acc.push(...rows);
    if (rows.length < PAGE) break;
  }
  return acc;
}

/**
 * Custos de todos os controles de uma safra (relatório).
 * `lavouraId` opcional restringe a uma única lavoura.
 */
export async function fetchCustosLavouraSafra(
  safraId: string,
  lavouraId?: string | null
): Promise<CustosLavoura[]> {
  let controlesQuery = supabase
    .from("controle_lavouras")
    .select("id, area_total, ha_plantado, lavouras:lavoura_id(nome), safras:safra_id(nome)")
    .eq("safra_id", safraId);
  if (lavouraId) controlesQuery = controlesQuery.eq("lavoura_id", lavouraId);

  const { data: controles, error } = await controlesQuery;
  if (error) throw error;

  const ids = (controles || []).map((c: any) => c.id);
  if (ids.length === 0) return [];

  const [plantios, aplicacoes, colheitas] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from("plantios")
        .select("controle_lavoura_id, valor_total")
        .in("controle_lavoura_id", ids)
        .order("id")
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("aplicacoes")
        .select("controle_lavoura_id, tipo, valor_total")
        .in("controle_lavoura_id", ids)
        .order("id")
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("colheitas")
        .select("controle_lavoura_id, producao_liquida_kg, producao_kg")
        .in("controle_lavoura_id", ids)
        .order("id")
        .range(from, to)
    ),
  ]);

  const porControle = <T extends { controle_lavoura_id: string | null }>(list: T[]) => {
    const map = new Map<string, T[]>();
    list.forEach((r) => {
      const k = r.controle_lavoura_id || "";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    return map;
  };

  const mapPlantios = porControle(plantios);
  const mapAplicacoes = porControle(aplicacoes);
  const mapColheitas = porControle(colheitas);

  return (controles || [])
    .map((c: any) =>
      agregarCustosLavoura({
        controleId: c.id,
        lavouraNome: c.lavouras?.nome || "-",
        safraNome: c.safras?.nome || "-",
        areaTotal: c.area_total,
        haPlantado: c.ha_plantado,
        plantios: mapPlantios.get(c.id) || [],
        aplicacoes: mapAplicacoes.get(c.id) || [],
        colheitas: mapColheitas.get(c.id) || [],
      })
    )
    .filter((c) => c.custoTotal > 0 || c.producaoKg > 0)
    .sort((a, b) => a.lavouraNome.localeCompare(b.lavouraNome, "pt-BR"));
}
