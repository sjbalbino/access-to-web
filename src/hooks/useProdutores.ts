import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Produtor {
  id: string;
  codigo: string | null;
  nome: string;
  tipo_pessoa: string | null;
  tipo_produtor: string | null;
  cpf_cnpj: string | null;
  identidade: string | null;
  granja_id: string | null;
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

export type ProdutorInput = Partial<Omit<Produtor, "id" | "created_at" | "updated_at">> & { nome: string };

export function useProdutores() {
  return useQuery({
    queryKey: ["produtores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtores")
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

export function useProdutor(id: string | undefined) {
  return useQuery({
    queryKey: ["produtores", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("produtores")
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

// Verificar se produtor tem movimentação (inscrições, colheitas, notas fiscais, contratos)
async function verificarMovimentacaoProdutor(produtorId: string): Promise<boolean> {
  // Verificar inscrições
  const { count: inscricoesCount } = await supabase
    .from("inscricoes_produtor")
    .select("*", { count: "exact", head: true })
    .eq("produtor_id", produtorId);
  
  if (inscricoesCount && inscricoesCount > 0) return true;

  // Verificar notas fiscais pelo produtor_id
  const { count: notasCount } = await supabase
    .from("notas_fiscais")
    .select("*", { count: "exact", head: true })
    .eq("produtor_id", produtorId);
  
  if (notasCount && notasCount > 0) return true;

  return false;
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
      // Verificar se tem movimentação
      const temMovimentacao = await verificarMovimentacaoProdutor(id);
      
      if (temMovimentacao) {
        // Marcar como inativo ao invés de excluir
        const { error } = await supabase
          .from("produtores")
          .update({ ativo: false })
          .eq("id", id);
        if (error) throw error;
        return { inativado: true };
      } else {
        // Excluir de fato
        const { error } = await supabase
          .from("produtores")
          .delete()
          .eq("id", id);
        if (error) throw error;
        return { inativado: false };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["produtores"] });
      if (result.inativado) {
        toast.success("Produtor possui movimentação e foi marcado como inativo.");
      } else {
        toast.success("Produtor excluído com sucesso!");
      }
    },
    onError: (error) => {
      toast.error("Erro ao excluir produtor: " + error.message);
    },
  });
}
