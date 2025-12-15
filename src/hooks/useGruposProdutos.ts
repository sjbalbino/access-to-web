import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GrupoProduto {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
}

export type GrupoProdutoInput = Omit<GrupoProduto, 'id' | 'created_at' | 'updated_at'>;

export function useGruposProdutos() {
  return useQuery({
    queryKey: ['grupos_produtos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grupos_produtos')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data as GrupoProduto[];
    },
  });
}

export function useCreateGrupoProduto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: GrupoProdutoInput) => {
      const { data, error } = await supabase
        .from('grupos_produtos')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos_produtos'] });
      toast.success('Grupo criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar grupo: ' + error.message);
    },
  });
}

export function useUpdateGrupoProduto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<GrupoProdutoInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('grupos_produtos')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos_produtos'] });
      toast.success('Grupo atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar grupo: ' + error.message);
    },
  });
}

export function useDeleteGrupoProduto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('grupos_produtos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos_produtos'] });
      toast.success('Grupo excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir grupo: ' + error.message);
    },
  });
}
