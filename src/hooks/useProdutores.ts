import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Produtor {
  id: string;
  codigo: string | null;
  nome: string;
  tipo_pessoa: string | null;
  cpf_cnpj: string | null;
  identidade: string | null;
  empresa_id: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
}

export type ProdutorInput = Omit<Produtor, "id" | "created_at" | "updated_at">;

export function useProdutores() {
  return useQuery({
    queryKey: ["produtores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtores")
        .select(`
          *,
          empresas (id, razao_social)
        `)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useProdutor(id: string | undefined) {
  return useQuery({
    queryKey: ["produtores", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("produtores")
        .select(`
          *,
          empresas (id, razao_social)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProdutor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (produtor: ProdutorInput) => {
      const { data, error } = await supabase
        .from("produtores")
        .insert(produtor)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtores"] });
      toast.success("Produtor cadastrado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar produtor: " + error.message);
    },
  });
}

export function useUpdateProdutor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...produtor }: Partial<Produtor> & { id: string }) => {
      const { data, error } = await supabase
        .from("produtores")
        .update(produtor)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtores"] });
      toast.success("Produtor atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar produtor: " + error.message);
    },
  });
}

export function useDeleteProdutor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("produtores")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtores"] });
      toast.success("Produtor excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir produtor: " + error.message);
    },
  });
}