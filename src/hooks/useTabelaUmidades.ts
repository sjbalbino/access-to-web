import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TabelaUmidade = {
  id: string;
  cultura_id: string | null;
  umidade_minima: number;
  umidade_maxima: number;
  desconto_percentual: number | null;
  melhoria_ph: number | null;
  observacoes: string | null;
  ativa: boolean | null;
  created_at: string;
  updated_at: string;
};

export type TabelaUmidadeInsert = Omit<TabelaUmidade, 'id' | 'created_at' | 'updated_at'>;

export function useTabelaUmidades() {
  return useQuery({
    queryKey: ['tabela_umidades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tabela_umidades')
        .select(`
          *,
          cultura:culturas(id, nome)
        `)
        .order('umidade_minima');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTabelaUmidade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (umidade: TabelaUmidadeInsert) => {
      const { data, error } = await supabase
        .from('tabela_umidades')
        .insert(umidade)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabela_umidades'] });
      toast.success('Faixa de umidade criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar faixa de umidade: ' + error.message);
    },
  });
}

export function useUpdateTabelaUmidade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...umidade }: Partial<TabelaUmidade> & { id: string }) => {
      const { data, error } = await supabase
        .from('tabela_umidades')
        .update(umidade)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabela_umidades'] });
      toast.success('Faixa de umidade atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar faixa de umidade: ' + error.message);
    },
  });
}

export function useDeleteTabelaUmidade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tabela_umidades')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabela_umidades'] });
      toast.success('Faixa de umidade excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir faixa de umidade: ' + error.message);
    },
  });
}
