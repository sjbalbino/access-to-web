import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TipoAplicacao = 'adubacao' | 'herbicida' | 'fungicida' | 'inseticida' | 'dessecacao' | 'adjuvante' | 'micronutriente' | 'inoculante' | 'calcario';

export interface Aplicacao {
  id: string;
  tipo: TipoAplicacao;
  controle_lavoura_id: string | null;
  safra_id: string | null;
  lavoura_id: string;
  produto_id: string | null;
  data_aplicacao: string | null;
  area_aplicada: number | null;
  dose_ha: number | null;
  quantidade_total: number | null;
  valor_unitario: number | null;
  valor_total: number | null;
  aplicador: string | null;
  equipamento: string | null;
  condicao_climatica: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  safras?: { id: string; nome: string } | null;
  lavouras?: { id: string; nome: string } | null;
  produtos?: { 
    id: string; 
    nome: string;
    preco_custo: number | null;
    unidades_medida: { id: string; sigla: string | null } | null;
  } | null;
}

export type AplicacaoInput = {
  tipo: TipoAplicacao;
  controle_lavoura_id: string;
  produto_id: string | null;
  data_aplicacao: string | null;
  area_aplicada: number | null;
  dose_ha: number | null;
  quantidade_total: number | null;
  valor_unitario: number | null;
  valor_total: number | null;
  aplicador: string | null;
  equipamento: string | null;
  condicao_climatica: string | null;
  observacoes: string | null;
};

export const TIPOS_APLICACAO: { value: TipoAplicacao; label: string }[] = [
  { value: 'adubacao', label: 'Adubação' },
  { value: 'herbicida', label: 'Herbicida' },
  { value: 'fungicida', label: 'Fungicida' },
  { value: 'inseticida', label: 'Inseticida' },
  { value: 'dessecacao', label: 'Dessecação' },
  { value: 'adjuvante', label: 'Adjuvante' },
  { value: 'micronutriente', label: 'Micronutriente' },
  { value: 'inoculante', label: 'Inoculante' },
  { value: 'calcario', label: 'Calcário' },
];

export function useAplicacoes(tipo: TipoAplicacao, controleLavouraId: string | null) {
  return useQuery({
    queryKey: ["aplicacoes", tipo, controleLavouraId],
    queryFn: async () => {
      if (!controleLavouraId) return [];
      
      const { data, error } = await supabase
        .from("aplicacoes")
        .select(`
          *,
          safras (id, nome),
          lavouras (id, nome),
          produtos (id, nome, preco_custo, unidades_medida:unidade_medida_id (id, sigla))
        `)
        .eq("tipo", tipo)
        .eq("controle_lavoura_id", controleLavouraId)
        .order("data_aplicacao", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!controleLavouraId,
  });
}

export function useCreateAplicacao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (aplicacao: AplicacaoInput) => {
      // Buscar o controle_lavoura para obter safra_id e lavoura_id
      const { data: controle, error: controleError } = await supabase
        .from("controle_lavouras")
        .select("safra_id, lavoura_id")
        .eq("id", aplicacao.controle_lavoura_id)
        .single();
      
      if (controleError) throw controleError;
      
      const { data, error } = await supabase
        .from("aplicacoes")
        .insert({
          ...aplicacao,
          safra_id: controle.safra_id,
          lavoura_id: controle.lavoura_id,
        })
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
    mutationFn: async ({ id, ...aplicacao }: Partial<AplicacaoInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("aplicacoes")
        .update(aplicacao)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
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
