import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TipoAplicacao } from "./useAplicacoes";

// Mapeamento de tipo de aplicação para nome do grupo de produtos
export const TIPO_GRUPO_MAP: Record<TipoAplicacao, string> = {
  'adubacao': 'FERTILIZANTES',
  'herbicida': 'HERBICIDAS',
  'fungicida': 'FUNGICIDAS',
  'inseticida': 'INSETICIDAS',
  'dessecacao': 'DESSECANTES',
  'adjuvante': 'ADJUVANTES',
  'micronutriente': 'MICRONUTRIENTES',
  'inoculante': 'INOCULANTES',
  'calcario': 'CALCÁRIOS',
};

export interface ProdutoComUnidade {
  id: string;
  nome: string;
  preco_custo: number | null;
  unidade_medida_id: string | null;
  unidades_medida: {
    id: string;
    sigla: string | null;
    descricao: string;
  } | null;
}

export function useProdutosByGrupo(tipoAplicacao: TipoAplicacao) {
  const grupoNome = TIPO_GRUPO_MAP[tipoAplicacao];

  return useQuery({
    queryKey: ["produtos", "grupo", grupoNome],
    queryFn: async () => {
      // Primeiro busca o grupo pelo nome
      const { data: grupo, error: grupoError } = await supabase
        .from("grupos_produtos")
        .select("id")
        .eq("nome", grupoNome)
        .eq("ativo", true)
        .single();

      if (grupoError || !grupo) {
        console.warn(`Grupo "${grupoNome}" não encontrado`);
        return [];
      }

      // Busca produtos ativos do grupo
      const { data, error } = await supabase
        .from("produtos")
        .select(`
          id,
          nome,
          preco_custo,
          unidade_medida_id,
          unidades_medida:unidade_medida_id (id, sigla, descricao)
        `)
        .eq("grupo_id", grupo.id)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as ProdutoComUnidade[];
    },
    enabled: !!grupoNome,
  });
}
