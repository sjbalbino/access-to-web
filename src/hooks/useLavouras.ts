import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Lavoura {
  id: string;
  codigo: number;
  nome: string;
  granja_id: string | null;
  total_hectares: number | null;
  area_nao_aproveitavel: number | null;
  area_plantio: number | null;
  latitude: number | null;
  longitude: number | null;
  observacoes: string | null;
  ativa: boolean | null;
  recebe_terceiros: boolean | null;
  created_at: string;
  updated_at: string;
}

export type LavouraInput = Omit<Lavoura, "id" | "created_at" | "updated_at" | "codigo">;

export function useLavouras() {
  return useQuery({
    queryKey: ["lavouras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lavouras")
        .select(`
          *,
          granja:granjas (id, razao_social)
        `)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useLavoura(id: string | undefined) {
  return useQuery({
    queryKey: ["lavouras", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("lavouras")
        .select(`
          *,
          granja:granjas (id, razao_social)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateLavoura() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (lavoura: LavouraInput) => {
      const { data, error } = await supabase
        .from("lavouras")
        .insert(lavoura)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lavouras"] });
      toast.success("Lavoura cadastrada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar lavoura: " + error.message);
    },
  });
}

export function useUpdateLavoura() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...lavoura }: Partial<Lavoura> & { id: string }) => {
      const { data, error } = await supabase
        .from("lavouras")
        .update(lavoura)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lavouras"] });
      toast.success("Lavoura atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar lavoura: " + error.message);
    },
  });
}

export function useDeleteLavoura() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lavouras")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lavouras"] });
      toast.success("Lavoura excluída com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir lavoura: " + error.message);
    },
  });
}
