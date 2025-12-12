import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Chuva {
  id: string;
  controle_lavoura_id: string;
  data_chuva: string | null;
  quantidade_mm: number | null;
  duracao_horas: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type ChuvaInput = Omit<Chuva, 'id' | 'created_at' | 'updated_at'>;

export function useChuvas(controleLavouraId: string | null) {
  return useQuery({
    queryKey: ['chuvas', controleLavouraId],
    queryFn: async () => {
      if (!controleLavouraId) return [];
      const { data, error } = await supabase
        .from('chuvas')
        .select('*')
        .eq('controle_lavoura_id', controleLavouraId)
        .order('data_chuva', { ascending: false });
      if (error) throw error;
      return data as Chuva[];
    },
    enabled: !!controleLavouraId,
  });
}

export function useCreateChuva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ChuvaInput) => {
      const { data, error } = await supabase.from('chuvas').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chuvas'] });
      toast({ title: 'Registro de chuva criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar registro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateChuva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<ChuvaInput>) => {
      const { data, error } = await supabase.from('chuvas').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chuvas'] });
      toast({ title: 'Registro atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar registro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteChuva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('chuvas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chuvas'] });
      toast({ title: 'Registro excluído com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir registro', description: error.message, variant: 'destructive' });
    },
  });
}
