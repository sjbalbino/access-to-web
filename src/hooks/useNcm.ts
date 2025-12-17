import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Ncm {
  id: string;
  codigo: string;
  descricao: string;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
}

export type NcmInput = Omit<Ncm, 'id' | 'created_at' | 'updated_at'>;

export function useNcm() {
  return useQuery({
    queryKey: ['ncm'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ncm')
        .select('*')
        .order('codigo');
      if (error) throw error;
      return data as Ncm[];
    },
  });
}

export function useCreateNcm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NcmInput) => {
      const { data, error } = await supabase
        .from('ncm')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ncm'] });
      toast.success('NCM criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar NCM: ' + error.message);
    },
  });
}

export function useUpdateNcm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<NcmInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('ncm')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ncm'] });
      toast.success('NCM atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar NCM: ' + error.message);
    },
  });
}

export function useDeleteNcm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ncm')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ncm'] });
      toast.success('NCM excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir NCM: ' + error.message);
    },
  });
}
