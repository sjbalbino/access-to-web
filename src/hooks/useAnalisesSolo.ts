import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AnaliseSolo {
  id: string;
  controle_lavoura_id: string;
  data_coleta: string | null;
  laboratorio: string | null;
  ph: number | null;
  materia_organica: number | null;
  fosforo: number | null;
  potassio: number | null;
  calcio: number | null;
  magnesio: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type AnaliseSoloInput = Omit<AnaliseSolo, 'id' | 'created_at' | 'updated_at'>;

export function useAnalisesSolo(controleLavouraId: string | null) {
  return useQuery({
    queryKey: ['analises_solo', controleLavouraId],
    queryFn: async () => {
      if (!controleLavouraId) return [];
      const { data, error } = await supabase
        .from('analises_solo')
        .select('*')
        .eq('controle_lavoura_id', controleLavouraId)
        .order('data_coleta', { ascending: false });
      if (error) throw error;
      return data as AnaliseSolo[];
    },
    enabled: !!controleLavouraId,
  });
}

export function useCreateAnaliseSolo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AnaliseSoloInput) => {
      const { data, error } = await supabase.from('analises_solo').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analises_solo'] });
      toast({ title: 'Análise de solo criada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar análise', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateAnaliseSolo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<AnaliseSoloInput>) => {
      const { data, error } = await supabase.from('analises_solo').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analises_solo'] });
      toast({ title: 'Análise atualizada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar análise', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteAnaliseSolo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('analises_solo').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analises_solo'] });
      toast({ title: 'Análise excluída com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir análise', description: error.message, variant: 'destructive' });
    },
  });
}
