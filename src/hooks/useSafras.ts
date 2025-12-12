import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Safra {
  id: string;
  codigo: string | null;
  nome: string;
  cultura_id: string | null;
  ano_colheita: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export type SafraInput = Omit<Safra, "id" | "created_at" | "updated_at">;

export function useSafras() {
  return useQuery({
    queryKey: ["safras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safras")
        .select(`
          *,
          culturas (id, nome)
        `)
        .order("nome", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSafra(id: string | undefined) {
  return useQuery({
    queryKey: ["safras", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("safras")
        .select(`
          *,
          culturas (id, nome)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSafra() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (safra: SafraInput) => {
      const { data, error } = await supabase
        .from("safras")
        .insert(safra)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safras"] });
      toast.success("Safra cadastrada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar safra: " + error.message);
    },
  });
}

export function useUpdateSafra() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...safra }: Partial<Safra> & { id: string }) => {
      const { data, error } = await supabase
        .from("safras")
        .update(safra)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safras"] });
      toast.success("Safra atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar safra: " + error.message);
    },
  });
}

export function useDeleteSafra() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("safras")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safras"] });
      toast.success("Safra excluída com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir safra: " + error.message);
    },
  });
}