import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TipoAplicacao } from "./useAplicacoes";

// Mapeamento de tipo de aplicação para nome-base do grupo de produtos.
// Empresas importadas do sistema legado costumam ter grupos por cultura
// (ex.: "FUNGICIDAS - SOJA", "FUNGICIDAS-AVEIA"), por isso a busca é por prefixo.
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

function normalizar(valor: string | null | undefined) {
  return (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

/** Nomes-base alternativos aceitos para o mesmo tipo de aplicação. */
const ALIASES: Partial<Record<TipoAplicacao, string[]>> = {
  calcario: ['CALCARIO', 'CALCARIOS', 'CORRETIVOS'],
  adubacao: ['FERTILIZANTE', 'FERTILIZANTES', 'ADUBOS', 'ADUBO'],
};

export function useProdutosByGrupo(tipoAplicacao: TipoAplicacao) {
  const grupoNome = TIPO_GRUPO_MAP[tipoAplicacao];

  return useQuery({
    queryKey: ["produtos", "grupo", tipoAplicacao, grupoNome],
    queryFn: async () => {
      const basesAceitas = [
        normalizar(grupoNome),
        ...(ALIASES[tipoAplicacao] || []).map(normalizar),
      ];

      // Busca todos os grupos ativos do tenant (RLS já limita à empresa atual)
      // e filtra localmente por prefixo, ignorando acentos e sufixos de cultura.
      const { data: grupos, error: gruposError } = await supabase
        .from("grupos_produtos")
        .select("id, nome")
        .eq("ativo", true);

      if (gruposError) throw gruposError;

      const gruposIds = (grupos || [])
        .filter((grupo) => {
          const nome = normalizar(grupo.nome);
          return basesAceitas.some(
            (base) => !!base && (nome === base || nome.startsWith(base))
          );
        })
        .map((grupo) => grupo.id);

      if (gruposIds.length === 0) {
        console.warn(`Nenhum grupo de produtos encontrado para "${grupoNome}"`);
        return [];
      }

      const { data, error } = await supabase
        .from("produtos")
        .select(`
          id,
          nome,
          preco_custo,
          unidade_medida_id,
          unidades_medida:unidade_medida_id (id, sigla, descricao)
        `)
        .in("grupo_id", gruposIds)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return (data || []) as ProdutoComUnidade[];
    },
    enabled: !!grupoNome,
  });
}
