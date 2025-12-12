import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Inseto {
  id: string;
  controle_lavoura_id: string;
  data_registro: string | null;
  tipo_inseto: string | null;
  nivel_infestacao: string | null;
  area_afetada: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type InsetoInput = Omit<Inseto, 'id' | 'created_at' | 'updated_at'>;

export function useInsetos(controleLavouraId: string | null) {
  return useQuery({
    queryKey: ['insetos', controleLavouraId],
    queryFn: async () => {
      if (!controleLavouraId) return [];
      const { data, error } = await supabase
        .from('insetos')
        .select('*')
        .eq('controle_lavoura_id', controleLavouraId)
        .order('data_registro', { ascending: false });
      if (error) throw error;
      return data as Inseto[];
    },
    enabled: !!controleLavouraId,
  });
}

export function useCreateInseto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: InsetoInput) => {
      const { data, error } = await supabase.from('insetos').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insetos'] });
      toast({ title: 'Registro de inseto criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar registro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateInseto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<InsetoInput>) => {
      const { data, error } = await supabase.from('insetos').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insetos'] });
      toast({ title: 'Registro atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar registro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteInseto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('insetos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insetos'] });
      toast({ title: 'Registro excluído com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir registro', description: error.message, variant: 'destructive' });
    },
  });
}
