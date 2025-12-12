import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Variedade {
  id: string;
  codigo: string | null;
  nome: string;
  cultura_id: string | null;
  ativa: boolean | null;
  created_at: string;
  updated_at: string;
}

export function useVariedades(culturaId?: string | null) {
  return useQuery({
    queryKey: ["variedades", culturaId],
    queryFn: async () => {
      let query = supabase
        .from("variedades")
        .select("*")
        .eq("ativa", true)
        .order("nome");
      
      if (culturaId) {
        query = query.eq("cultura_id", culturaId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Variedade[];
    },
  });
}
