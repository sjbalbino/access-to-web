import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface PlantaInvasora {
  id: string;
  controle_lavoura_id: string;
  data_registro: string | null;
  tipo_planta: string | null;
  nivel_infestacao: string | null;
  area_afetada: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type PlantaInvasoraInput = Omit<PlantaInvasora, 'id' | 'created_at' | 'updated_at'>;

export function usePlantasInvasoras(controleLavouraId: string | null) {
  return useQuery({
    queryKey: ['plantas_invasoras', controleLavouraId],
    queryFn: async () => {
      if (!controleLavouraId) return [];
      const { data, error } = await supabase
        .from('plantas_invasoras')
        .select('*')
        .eq('controle_lavoura_id', controleLavouraId)
        .order('data_registro', { ascending: false });
      if (error) throw error;
      return data as PlantaInvasora[];
    },
    enabled: !!controleLavouraId,
  });
}

export function useCreatePlantaInvasora() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlantaInvasoraInput) => {
      const { data, error } = await supabase.from('plantas_invasoras').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantas_invasoras'] });
      toast({ title: 'Registro de planta invasora criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar registro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdatePlantaInvasora() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<PlantaInvasoraInput>) => {
      const { data, error } = await supabase.from('plantas_invasoras').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantas_invasoras'] });
      toast({ title: 'Registro atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar registro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeletePlantaInvasora() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plantas_invasoras').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantas_invasoras'] });
      toast({ title: 'Registro excluído com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir registro', description: error.message, variant: 'destructive' });
    },
  });
}
