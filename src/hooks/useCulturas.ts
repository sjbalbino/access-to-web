import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Cultura {
  id: string;
  codigo: string | null;
  nome: string;
  peso_saco_industria: number | null;
  peso_saco_semente: number | null;
  informar_ph: boolean | null;
  ativa: boolean | null;
  created_at: string;
  updated_at: string;
}

export type CulturaInput = Omit<Cultura, "id" | "created_at" | "updated_at">;

export function useCulturas() {
  return useQuery({
    queryKey: ["culturas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("culturas")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as Cultura[];
    },
  });
}

export function useCultura(id: string | undefined) {
  return useQuery({
    queryKey: ["culturas", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("culturas")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Cultura | null;
    },
    enabled: !!id,
  });
}

export function useCreateCultura() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (cultura: CulturaInput) => {
      const { data, error } = await supabase
        .from("culturas")
        .insert(cultura)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["culturas"] });
      toast.success("Cultura cadastrada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar cultura: " + error.message);
    },
  });
}

export function useUpdateCultura() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...cultura }: Partial<Cultura> & { id: string }) => {
      const { data, error } = await supabase
        .from("culturas")
        .update(cultura)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["culturas"] });
      toast.success("Cultura atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar cultura: " + error.message);
    },
  });
}

export function useDeleteCultura() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("culturas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["culturas"] });
      toast.success("Cultura excluída com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir cultura: " + error.message);
    },
  });
}