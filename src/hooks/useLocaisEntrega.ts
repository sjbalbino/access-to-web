import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LocalEntrega {
  id: string;
  granja_id: string | null;
  codigo: string | null;
  nome: string;
  nome_fantasia: string | null;
  tipo_pessoa: string | null;
  cpf_cnpj: string | null;
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
  observacoes: string | null;
  ativo: boolean | null;
  is_sede: boolean | null;
  created_at: string;
  updated_at: string;
  granjas?: { razao_social: string; nome_fantasia: string | null } | null;
}

export type LocalEntregaInsert = Omit<LocalEntrega, 'id' | 'created_at' | 'updated_at' | 'granjas'>;
export type LocalEntregaUpdate = Partial<LocalEntregaInsert>;

// Buscar local sede padrão
export function useLocalSede() {
  return useQuery({
    queryKey: ["locais_entrega_sede"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locais_entrega")
        .select(`
          *,
          granjas (razao_social, nome_fantasia)
        `)
        .eq("is_sede", true)
        .eq("ativo", true)
        .maybeSingle();
      if (error) throw error;
      return data as LocalEntrega | null;
    },
  });
}

export function useLocaisEntrega(granjaId?: string) {
  return useQuery({
    queryKey: ["locais_entrega", granjaId],
    queryFn: async () => {
      let query = supabase
        .from("locais_entrega")
        .select(`
          *,
          granjas (razao_social, nome_fantasia)
        `)
        .order("nome");

      if (granjaId) {
        query = query.eq("granja_id", granjaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LocalEntrega[];
    },
  });
}

export function useLocalEntrega(id: string | undefined) {
  return useQuery({
    queryKey: ["locais_entrega", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("locais_entrega")
        .select(`
          *,
          granjas (razao_social, nome_fantasia)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as LocalEntrega;
    },
    enabled: !!id,
  });
}

export function useCreateLocalEntrega() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (local: LocalEntregaInsert) => {
      const { data, error } = await supabase
        .from("locais_entrega")
        .insert(local)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locais_entrega"] });
      toast.success("Local de entrega cadastrado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao cadastrar local de entrega: " + error.message);
    },
  });
}

export function useUpdateLocalEntrega() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...local }: LocalEntregaUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("locais_entrega")
        .update(local)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locais_entrega"] });
      toast.success("Local de entrega atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar local de entrega: " + error.message);
    },
  });
}

export function useDeleteLocalEntrega() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("locais_entrega")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locais_entrega"] });
      toast.success("Local de entrega excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir local de entrega: " + error.message);
    },
  });
}
