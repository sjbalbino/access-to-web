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
    queryKey: ["ibge_municipios", uf],
    queryFn: async () => {
      let query = supabase
        .from("ibge_municipios")
        .select("*")
        .order("nome");

      if (uf) {
        query = query.eq("uf", uf.toUpperCase());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as IbgeMunicipio[];
    },
    enabled: !!uf,
  });
}
