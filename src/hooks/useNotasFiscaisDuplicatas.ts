import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NotaFiscalDuplicata {
  id: string;
  nota_fiscal_id: string;
  numero: string | null;
  data_vencimento: string | null;
  valor: number | null;
  created_at: string;
}

export interface NotaFiscalDuplicataInsert {
  nota_fiscal_id: string;
  numero?: string | null;
  data_vencimento?: string | null;
  valor?: number | null;
}

export interface NotaFiscalDuplicataUpdate {
  numero?: string | null;
  data_vencimento?: string | null;
  valor?: number | null;
}

export function useNotasFiscaisDuplicatas(notaFiscalId: string | null) {
  const queryClient = useQueryClient();

  const { data: duplicatas, isLoading, error } = useQuery({
    queryKey: ["notas-fiscais-duplicatas", notaFiscalId],
    queryFn: async () => {
      if (!notaFiscalId) return [];
      
      const { data, error } = await supabase
        .from("notas_fiscais_duplicatas")
        .select("*")
        .eq("nota_fiscal_id", notaFiscalId)
        .order("data_vencimento", { ascending: true });
      
      if (error) throw error;
      return data as NotaFiscalDuplicata[];
    },
    enabled: !!notaFiscalId,
  });

  const createDuplicata = useMutation({
    mutationFn: async (duplicata: NotaFiscalDuplicataInsert) => {
      const { data, error } = await supabase
        .from("notas_fiscais_duplicatas")
        .insert(duplicata)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais-duplicatas", notaFiscalId] });
      toast.success("Duplicata adicionada");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar duplicata: ${error.message}`);
    },
  });

  const updateDuplicata = useMutation({
    mutationFn: async ({ id, ...data }: NotaFiscalDuplicataUpdate & { id: string }) => {
      const { data: result, error } = await supabase
        .from("notas_fiscais_duplicatas")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais-duplicatas", notaFiscalId] });
      toast.success("Duplicata atualizada");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar duplicata: ${error.message}`);
    },
  });

  const deleteDuplicata = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notas_fiscais_duplicatas")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais-duplicatas", notaFiscalId] });
      toast.success("Duplicata removida");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover duplicata: ${error.message}`);
    },
  });

  return {
    duplicatas: duplicatas || [],
    isLoading,
    error,
    createDuplicata,
    updateDuplicata,
    deleteDuplicata,
  };
}
