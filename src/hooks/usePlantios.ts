import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Plantio {
  id: string;
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

export type PlantioInput = Omit<Plantio, "id" | "created_at" | "updated_at" | "safras" | "lavouras" | "culturas" | "variedades">;

export function usePlantios(safraId?: string | null, lavouraId?: string | null) {
  return useQuery({
    queryKey: ["plantios", safraId, lavouraId],
    queryFn: async () => {
      let query = supabase
        .from("plantios")
        .select(`
          *,
          safras (id, nome),
          lavouras (id, nome),
          culturas (id, nome),
          variedades (id, nome)
        `)
        .order("data_plantio", { ascending: false });
      
      if (safraId) {
        query = query.eq("safra_id", safraId);
      }
      if (lavouraId) {
        query = query.eq("lavoura_id", lavouraId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePlantio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (plantio: PlantioInput) => {
      const { data, error } = await supabase
        .from("plantios")
        .insert(plantio)
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
    mutationFn: async ({ id, ...plantio }: Partial<Plantio> & { id: string }) => {
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
