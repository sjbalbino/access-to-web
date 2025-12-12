import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type UnidadeMedida = {
  id: string;
  codigo: string;
  descricao: string;
  sigla: string | null;
  ativa: boolean | null;
  created_at: string;
  updated_at: string;
};

export type UnidadeMedidaInsert = Omit<UnidadeMedida, 'id' | 'created_at' | 'updated_at'>;

export function useUnidadesMedida() {
  return useQuery({
    queryKey: ['unidades_medida'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unidades_medida')
        .select('*')
        .order('descricao');
      if (error) throw error;
      return data as UnidadeMedida[];
    },
  });
}

export function useCreateUnidadeMedida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (unidade: UnidadeMedidaInsert) => {
      const { data, error } = await supabase
        .from('unidades_medida')
        .insert(unidade)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades_medida'] });
      toast.success('Unidade de medida criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar unidade de medida: ' + error.message);
    },
  });
}

export function useUpdateUnidadeMedida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...unidade }: Partial<UnidadeMedida> & { id: string }) => {
      const { data, error } = await supabase
        .from('unidades_medida')
        .update(unidade)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades_medida'] });
      toast.success('Unidade de medida atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar unidade de medida: ' + error.message);
    },
  });
}

export function useDeleteUnidadeMedida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('unidades_medida')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades_medida'] });
      toast.success('Unidade de medida excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir unidade de medida: ' + error.message);
    },
  });
}
