import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Pivo {
  id: string;
  controle_lavoura_id: string;
  data_irrigacao: string | null;
  lamina_mm: number | null;
  duracao_horas: number | null;
  energia_kwh: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type PivoInput = Omit<Pivo, 'id' | 'created_at' | 'updated_at'>;

export function usePivos(controleLavouraId: string | null) {
  return useQuery({
    queryKey: ['pivos', controleLavouraId],
    queryFn: async () => {
      if (!controleLavouraId) return [];
      const { data, error } = await supabase
        .from('pivos')
        .select('*')
        .eq('controle_lavoura_id', controleLavouraId)
        .order('data_irrigacao', { ascending: false });
      if (error) throw error;
      return data as Pivo[];
    },
    enabled: !!controleLavouraId,
  });
}

export function useCreatePivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PivoInput) => {
      const { data, error } = await supabase.from('pivos').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pivos'] });
      toast({ title: 'Registro de pivô criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar registro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdatePivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<PivoInput>) => {
      const { data, error } = await supabase.from('pivos').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pivos'] });
      toast({ title: 'Registro atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar registro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeletePivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pivos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pivos'] });
      toast({ title: 'Registro excluído com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir registro', description: error.message, variant: 'destructive' });
    },
  });
}
