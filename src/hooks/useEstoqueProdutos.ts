import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EstoqueProduto {
  id: string;
  produto_id: string;
  granja_id: string;
  quantidade: number | null;
  localizacao: string | null;
  lote: string | null;
  data_validade: string | null;
  custo_unitario: number | null;
  created_at: string;
  updated_at: string;
  granjas?: { id: string; razao_social: string };
}

export type EstoqueProdutoInput = Omit<EstoqueProduto, 'id' | 'created_at' | 'updated_at' | 'granjas'>;

export function useEstoqueProdutosByProduto(produtoId: string | null) {
  return useQuery({
    queryKey: ['estoque_produtos', produtoId],
    queryFn: async () => {
      if (!produtoId) return [];
      const { data, error } = await supabase
        .from('estoque_produtos')
        .select(`
          *,
          granjas:granja_id(id, razao_social)
        `)
        .eq('produto_id', produtoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EstoqueProduto[];
    },
    enabled: !!produtoId,
  });
}

export function useEstoqueProdutosByGranja(granjaId: string | null) {
  return useQuery({
    queryKey: ['estoque_produtos_granja', granjaId],
    queryFn: async () => {
      if (!granjaId) return [];
      const { data, error } = await supabase
        .from('estoque_produtos')
        .select(`
          *,
          granjas:granja_id(id, razao_social)
        `)
        .eq('granja_id', granjaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EstoqueProduto[];
    },
    enabled: !!granjaId,
  });
}

export function useCreateEstoqueProduto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: EstoqueProdutoInput) => {
      const { data, error } = await supabase
        .from('estoque_produtos')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque_produtos'] });
      toast.success('Estoque criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar estoque: ' + error.message);
    },
  });
}

export function useUpdateEstoqueProduto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<EstoqueProdutoInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('estoque_produtos')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque_produtos'] });
      toast.success('Estoque atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar estoque: ' + error.message);
    },
  });
}

export function useDeleteEstoqueProduto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('estoque_produtos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque_produtos'] });
      toast.success('Estoque excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir estoque: ' + error.message);
    },
  });
}
