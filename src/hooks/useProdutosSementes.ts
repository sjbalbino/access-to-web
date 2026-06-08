import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProdutosSementes() {
  return useQuery({
    queryKey: ["produtos", "sementes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, codigo, preco_custo, preco_venda, ncm")
        .or("grupo.ilike.%semente%,grupo_id.eq.09c5674b-a9aa-4215-aab5-202761b980bb,grupo_id.eq.1b7536f8-35cc-4eeb-a172-619bbaa325c5")
        .eq("ativo", true)
        .order("nome");
      
      if (error) throw error;
      return data;
    },
  });
}
