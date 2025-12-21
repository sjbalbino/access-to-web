import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Transportadora {
  id: string;
  granja_id: string | null;
  nome: string;
  cpf_cnpj: string | null;
  inscricao_estadual: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  placa_padrao: string | null;
  uf_placa_padrao: string | null;
  rntc: string | null;
  motorista_padrao: string | null;
  ativa: boolean | null;
  created_at: string;
  updated_at: string;
}

export type TransportadoraInsert = Omit<Transportadora, "id" | "created_at" | "updated_at">;
export type TransportadoraUpdate = Partial<TransportadoraInsert>;

export function useTransportadoras() {
  const queryClient = useQueryClient();

  const { data: transportadoras = [], isLoading, error } = useQuery({
    queryKey: ["transportadoras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transportadoras")
        .select("*")
        .order("nome");

      if (error) throw error;
      return data as Transportadora[];
    },
  });

  const createTransportadora = useMutation({
    mutationFn: async (transportadora: TransportadoraInsert) => {
      const { data, error } = await supabase
        .from("transportadoras")
        .insert(transportadora)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportadoras"] });
      toast.success("Transportadora criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar transportadora", { description: error.message });
    },
  });

  const updateTransportadora = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & TransportadoraUpdate) => {
      const { error } = await supabase
        .from("transportadoras")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportadoras"] });
      toast.success("Transportadora atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar transportadora", { description: error.message });
    },
  });

  const deleteTransportadora = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transportadoras")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportadoras"] });
      toast.success("Transportadora excluída com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir transportadora", { description: error.message });
    },
  });

  return {
    transportadoras,
    isLoading,
    error,
    createTransportadora,
    updateTransportadora,
    deleteTransportadora,
  };
}
