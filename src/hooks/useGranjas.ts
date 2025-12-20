import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Granja {
  id: string;
  codigo: string | null;
  razao_social: string;
  nome_fantasia: string | null;
  cpf: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  total_hectares: number | null;
  ativa: boolean | null;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export type GranjaInput = Partial<Omit<Granja, "id" | "created_at" | "updated_at">> & { razao_social: string };

export function useGranjas() {
  return useQuery({
    queryKey: ["granjas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("granjas")
        .select("*")
        .order("razao_social");
      if (error) throw error;
      return data as Granja[];
    },
  });
}

export function useGranja(id: string | undefined) {
  return useQuery({
    queryKey: ["granjas", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("granjas")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Granja | null;
    },
    enabled: !!id,
  });
}

export function useCreateGranja() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (granja: GranjaInput) => {
      const { data, error } = await supabase
        .from("granjas")
        .insert(granja)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["granjas"] });
      toast.success("Granja cadastrada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar granja: " + error.message);
    },
  });
}

export function useUpdateGranja() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...granja }: Partial<Granja> & { id: string }) => {
      const { data, error } = await supabase
        .from("granjas")
        .update(granja)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["granjas"] });
      toast.success("Granja atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar granja: " + error.message);
    },
  });
}

export function useDeleteGranja() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("granjas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["granjas"] });
      toast.success("Granja excluída com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir granja: " + error.message);
    },
  });
}
