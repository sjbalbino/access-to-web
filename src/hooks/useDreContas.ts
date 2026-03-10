import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DreConta {
  id: string;
  codigo: string;
  descricao: string;
  nivel: number;
  parent_id: string | null;
  tipo_saldo: string | null;
  ordem: number | null;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
}

export type DreContaInput = Omit<DreConta, 'id' | 'created_at' | 'updated_at'>;

export function useDreContas() {
  return useQuery({
    queryKey: ['dre_contas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dre_contas' as any).select('*').order('ordem').order('codigo');
      if (error) throw error;
      return data as unknown as DreConta[];
    },
  });
}

export function useCreateDreConta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DreContaInput) => {
      const { data, error } = await supabase.from('dre_contas' as any).insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dre_contas'] });
      toast.success('Conta DRE criada com sucesso!');
    },
    onError: (error) => toast.error('Erro ao criar conta DRE: ' + error.message),
  });
}

export function useUpdateDreConta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<DreContaInput> & { id: string }) => {
      const { data, error } = await supabase.from('dre_contas' as any).update(input).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dre_contas'] });
      toast.success('Conta DRE atualizada com sucesso!');
    },
    onError: (error) => toast.error('Erro ao atualizar conta DRE: ' + error.message),
  });
}

export function useDeleteDreConta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dre_contas' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dre_contas'] });
      toast.success('Conta DRE excluída com sucesso!');
    },
    onError: (error) => toast.error('Erro ao excluir conta DRE: ' + error.message),
  });
}
