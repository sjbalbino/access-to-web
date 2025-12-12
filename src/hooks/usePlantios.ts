import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Plantio {
  id: string;
  controle_lavoura_id: string | null;
  safra_id: string | null;
  lavoura_id: string;
  cultura_id: string | null;
  variedade_id: string | null;
  data_plantio: string | null;
  area_plantada: number | null;
  quantidade_semente: number | null;
  populacao_ha: number | null;
  espacamento_linha: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  safras?: { id: string; nome: string } | null;
  lavouras?: { id: string; nome: string } | null;
  culturas?: { id: string; nome: string } | null;
  variedades?: { id: string; nome: string } | null;
}

export type PlantioInput = {
  controle_lavoura_id: string;
  cultura_id: string | null;
  variedade_id: string | null;
  data_plantio: string | null;
  area_plantada: number | null;
  quantidade_semente: number | null;
  populacao_ha: number | null;
  espacamento_linha: number | null;
  observacoes: string | null;
};

export function usePlantios(controleLavouraId: string | null) {
  return useQuery({
    queryKey: ["plantios", controleLavouraId],
    queryFn: async () => {
      if (!controleLavouraId) return [];
      
      const { data, error } = await supabase
        .from("plantios")
        .select(`
          *,
          safras (id, nome),
          lavouras (id, nome),
          culturas (id, nome),
          variedades (id, nome)
        `)
        .eq("controle_lavoura_id", controleLavouraId)
        .order("data_plantio", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!controleLavouraId,
  });
}

export function useCreatePlantio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (plantio: PlantioInput) => {
      // Buscar o controle_lavoura para obter safra_id e lavoura_id
      const { data: controle, error: controleError } = await supabase
        .from("controle_lavouras")
        .select("safra_id, lavoura_id")
        .eq("id", plantio.controle_lavoura_id)
        .single();
      
      if (controleError) throw controleError;
      
      const { data, error } = await supabase
        .from("plantios")
        .insert({
          ...plantio,
          safra_id: controle.safra_id,
          lavoura_id: controle.lavoura_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plantios"] });
      toast.success("Plantio cadastrado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar plantio: " + error.message);
    },
  });
}

export function useUpdatePlantio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...plantio }: Partial<PlantioInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("plantios")
        .update(plantio)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plantios"] });
      toast.success("Plantio atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar plantio: " + error.message);
    },
  });
}

export function useDeletePlantio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("plantios")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plantios"] });
      toast.success("Plantio excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir plantio: " + error.message);
    },
  });
}
