import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CotacaoMercado {
  id: string;
  slug: string;
  nome: string;
  categoria: string;
  regiao: string | null;
  unidade: string;
  valor: number;
  variacao_percentual: number | null;
  fonte: string;
  fonte_url: string | null;
  data_referencia: string;
}

/**
 * Última cotação disponível de cada indicador.
 * Leitura pública (a tabela permite SELECT para visitantes não autenticados).
 */
export function useCotacoesAtuais() {
  return useQuery({
    queryKey: ["cotacoes_mercado", "atuais"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CotacaoMercado[]> => {
      const { data, error } = await supabase
        .from("cotacoes_mercado")
        .select("*")
        .order("data_referencia", { ascending: false })
        .limit(300);

      if (error) throw error;

      // Mantém apenas a linha mais recente de cada slug.
      const porSlug = new Map<string, CotacaoMercado>();
      (data ?? []).forEach((row) => {
        const item: CotacaoMercado = {
          ...row,
          valor: Number(row.valor),
          variacao_percentual:
            row.variacao_percentual === null ? null : Number(row.variacao_percentual),
        };
        if (!porSlug.has(item.slug)) porSlug.set(item.slug, item);
      });

      return [...porSlug.values()];
    },
  });
}

/** Histórico de um indicador, para o gráfico da página de indicadores. */
export function useHistoricoCotacao(slug: string | null, dias = 60) {
  return useQuery({
    queryKey: ["cotacoes_mercado", "historico", slug, dias],
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CotacaoMercado[]> => {
      if (!slug) return [];
      const { data, error } = await supabase
        .from("cotacoes_mercado")
        .select("*")
        .eq("slug", slug)
        .order("data_referencia", { ascending: true })
        .limit(dias);

      if (error) throw error;

      return (data ?? []).map((row) => ({
        ...row,
        valor: Number(row.valor),
        variacao_percentual:
          row.variacao_percentual === null ? null : Number(row.variacao_percentual),
      }));
    },
  });
}
