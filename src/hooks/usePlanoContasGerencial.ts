import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlanoContaGerencial {
  id: string;
  codigo: string;
  descricao: string;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
}

export type PlanoContaGerencialInput = Omit<PlanoContaGerencial, 'id' | 'created_at' | 'updated_at'>;

export function usePlanoContasGerencial() {
  return useQuery({
    queryKey: ['plano_contas_gerencial'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plano_contas_gerencial')
        .select('*')
        .order('codigo');
      if (error) throw error;
      return data as PlanoContaGerencial[];
    },
  });
}

export function useCreatePlanoContaGerencial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlanoContaGerencialInput) => {
      const { data, error } = await supabase
        .from('plano_contas_gerencial')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plano_contas_gerencial'] });
      toast.success('Conta gerencial criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar conta gerencial: ' + error.message);
    },
  });
}

export function useUpdatePlanoContaGerencial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<PlanoContaGerencialInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('plano_contas_gerencial')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plano_contas_gerencial'] });
      toast.success('Conta gerencial atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar conta gerencial: ' + error.message);
    },
  });
}

export function useDeletePlanoContaGerencial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('plano_contas_gerencial')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plano_contas_gerencial'] });
      toast.success('Conta gerencial excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir conta gerencial: ' + error.message);
    },
  });
}
