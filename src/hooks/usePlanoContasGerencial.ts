import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlanoContaGerencial {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string | null;
  ordem: number | null;
  imprimir: boolean | null;
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
      return data as unknown as PlanoContaGerencial[];
    },
  });
}

export function useCreatePlanoContaGerencial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlanoContaGerencialInput) => {
      const { data, error } = await supabase
        .from('plano_contas_gerencial')
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plano_contas_gerencial'] });
      toast.success('Centro de custo criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar centro de custo: ' + error.message);
    },
  });
}

export function useUpdatePlanoContaGerencial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<PlanoContaGerencialInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('plano_contas_gerencial')
        .update(input as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plano_contas_gerencial'] });
      toast.success('Centro de custo atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar centro de custo: ' + error.message);
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
      toast.success('Centro de custo excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir centro de custo: ' + error.message);
    },
  });
}
