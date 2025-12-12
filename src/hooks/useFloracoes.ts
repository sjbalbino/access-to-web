import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Floracao {
  id: string;
  controle_lavoura_id: string;
  data_inicio: string | null;
  data_fim: string | null;
  percentual_floracao: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type FloracaoInput = Omit<Floracao, 'id' | 'created_at' | 'updated_at'>;

export function useFloracoes(controleLavouraId: string | null) {
  return useQuery({
    queryKey: ['floracoes', controleLavouraId],
    queryFn: async () => {
      if (!controleLavouraId) return [];
      const { data, error } = await supabase
        .from('floracoes')
        .select('*')
        .eq('controle_lavoura_id', controleLavouraId)
        .order('data_inicio', { ascending: false });
      if (error) throw error;
      return data as Floracao[];
    },
    enabled: !!controleLavouraId,
  });
}

export function useCreateFloracao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: FloracaoInput) => {
      const { data, error } = await supabase.from('floracoes').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floracoes'] });
      toast({ title: 'Registro de floração criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar registro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateFloracao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<FloracaoInput>) => {
      const { data, error } = await supabase.from('floracoes').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floracoes'] });
      toast({ title: 'Registro atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar registro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFloracao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('floracoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floracoes'] });
      toast({ title: 'Registro excluído com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir registro', description: error.message, variant: 'destructive' });
    },
  });
}
