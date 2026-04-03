import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface IbgeMunicipio {
  id: string;
  codigo_ibge: string;
  nome: string;
  uf: string;
}

export function useIbgeMunicipios(uf?: string) {
  return useQuery({
    queryKey: ["ibge_municipios", uf || "all"],
    queryFn: async () => {
      let query = supabase
        .from("ibge_municipios")
        .select("*")
        .order("nome")
        .limit(6000);

      if (uf) {
        query = query.eq("uf", uf.toUpperCase());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as IbgeMunicipio[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes cache
  });
}
