import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Colheita {
  id: string;
  safra_id: string | null;
  lavoura_id: string;
  plantio_id: string | null;
  data_colheita: string | null;
  area_colhida: number | null;
  producao_kg: number | null;
  umidade: number | null;
  impureza: number | null;
  producao_liquida_kg: number | null;
  produtividade_sacas_ha: number | null;
  silo_id: string | null;
  placa_id: string | null;
  motorista: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  safras?: { id: string; nome: string } | null;
  lavouras?: { id: string; nome: string } | null;
  plantios?: { id: string; data_plantio: string } | null;
  silos?: { id: string; nome: string } | null;
  placas?: { id: string; placa: string } | null;
}

export type ColheitaInput = Omit<Colheita, "id" | "created_at" | "updated_at" | "safras" | "lavouras" | "plantios" | "silos" | "placas">;

export function useColheitas(safraId?: string | null, lavouraId?: string | null) {
  return useQuery({
    queryKey: ["colheitas", safraId, lavouraId],
    queryFn: async () => {
      let query = supabase
        .from("colheitas")
        .select(`
          *,
          safras (id, nome),
          lavouras (id, nome),
          plantios (id, data_plantio),
          silos (id, nome),
          placas (id, placa)
        `)
        .order("data_colheita", { ascending: false });
      
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

export function useCreateColheita() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (colheita: ColheitaInput) => {
      const { data, error } = await supabase
        .from("colheitas")
        .insert(colheita)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colheitas"] });
      toast.success("Colheita cadastrada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar colheita: " + error.message);
    },
  });
}

export function useUpdateColheita() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...colheita }: Partial<Colheita> & { id: string }) => {
      const { data, error } = await supabase
        .from("colheitas")
        .update(colheita)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colheitas"] });
      toast.success("Colheita atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar colheita: " + error.message);
    },
  });
}

export function useDeleteColheita() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("colheitas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colheitas"] });
      toast.success("Colheita excluída com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir colheita: " + error.message);
    },
  });
}
