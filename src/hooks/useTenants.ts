import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Tenant {
  id: string;
  codigo: string | null;
  razao_social: string;
  nome_fantasia: string | null;
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
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
}

export type TenantInput = Omit<Tenant, "id" | "created_at" | "updated_at">;

export function useTenants() {
  return useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("razao_social");

      if (error) throw error;
      return data as Tenant[];
    },
  });
}

export function useTenant(id: string | null) {
  return useQuery({
    queryKey: ["tenants", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Tenant;
    },
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenant: TenantInput) => {
      const { data, error } = await supabase
        .from("tenants")
        .insert(tenant)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Empresa contratante criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar empresa contratante: ${error.message}`);
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...tenant }: TenantInput & { id: string }) => {
      const { data, error } = await supabase
        .from("tenants")
        .update(tenant)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Empresa contratante atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar empresa contratante: ${error.message}`);
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Empresa contratante excluída com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir empresa contratante: ${error.message}`);
    },
  });
}
