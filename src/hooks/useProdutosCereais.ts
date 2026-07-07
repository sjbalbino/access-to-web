import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Retorna apenas os produtos vinculados a grupos marcados como
 * "Cereais (Venda de Grãos)". Usado para filtrar seleção de produto
 * em Transferências, Notas de Depósito, Devolução de Depósito,
 * Compras de Cereais e Venda da Produção.
 */
export function useProdutosCereais() {
  return useQuery({
    queryKey: ["produtos", "cereais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select(`
          *,
          unidade_medida:unidades_medida(id, codigo, descricao, sigla),
          fornecedor:clientes_fornecedores(id, nome),
          grupo_vinculado:grupos_produtos!inner(id, nome, cereais)
        `)
        .eq("ativo", true)
        .eq("grupo_vinculado.cereais", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}
