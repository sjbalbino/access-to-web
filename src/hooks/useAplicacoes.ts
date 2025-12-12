import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TipoAplicacao = 'adubacao' | 'herbicida' | 'fungicida' | 'inseticida' | 'dessecacao';

export interface Aplicacao {
  id: string;
  tipo: TipoAplicacao;
  safra_id: string | null;
  lavoura_id: string;
  plantio_id: string | null;
  produto_id: string | null;
  data_aplicacao: string | null;
  area_aplicada: number | null;
  dose_ha: number | null;
  quantidade_total: number | null;
  unidade_medida_id: string | null;
  aplicador: string | null;
  equipamento: string | null;
  condicao_climatica: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  safras?: { id: string; nome: string } | null;
  lavouras?: { id: string; nome: string } | null;
  plantios?: { id: string; data_plantio: string } | null;
  produtos?: { id: string; nome: string } | null;
  unidades_medida?: { id: string; sigla: string } | null;
}

export type AplicacaoInput = Omit<Aplicacao, "id" | "created_at" | "updated_at" | "safras" | "lavouras" | "plantios" | "produtos" | "unidades_medida">;

export const TIPOS_APLICACAO: { value: TipoAplicacao; label: string }[] = [
  { value: 'adubacao', label: 'Adubação' },
  { value: 'herbicida', label: 'Herbicida' },
  { value: 'fungicida', label: 'Fungicida' },
  { value: 'inseticida', label: 'Inseticida' },
  { value: 'dessecacao', label: 'Dessecação' },
];

export function useAplicacoes(tipo: TipoAplicacao, safraId?: string | null, lavouraId?: string | null) {
  return useQuery({
    queryKey: ["aplicacoes", tipo, safraId, lavouraId],
    queryFn: async () => {
      let query = supabase
        .from("aplicacoes")
        .select(`
          *,
          safras (id, nome),
          lavouras (id, nome),
          plantios (id, data_plantio),
          produtos (id, nome),
          unidades_medida (id, sigla)
        `)
        .eq("tipo", tipo)
        .order("data_aplicacao", { ascending: false });
      
      if (safraId) {
        query = query.eq("safra_id", safraId);
      }
      if (lavouraId) {
        query = query.eq("lavoura_id", lavouraId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAplicacao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (aplicacao: AplicacaoInput) => {
      const { data, error } = await supabase
        .from("aplicacoes")
        .insert(aplicacao)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aplicacoes", variables.tipo] });
      const tipoLabel = TIPOS_APLICACAO.find(t => t.value === variables.tipo)?.label || 'Aplicação';
      toast.success(`${tipoLabel} cadastrada com sucesso!`);
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar aplicação: " + error.message);
    },
  });
}

export function useUpdateAplicacao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...aplicacao }: Partial<Aplicacao> & { id: string }) => {
      const { data, error } = await supabase
        .from("aplicacoes")
        .update(aplicacao)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aplicacoes"] });
      toast.success("Aplicação atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar aplicação: " + error.message);
    },
  });
}

export function useDeleteAplicacao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("aplicacoes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aplicacoes"] });
      toast.success("Aplicação excluída com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir aplicação: " + error.message);
    },
  });
}
