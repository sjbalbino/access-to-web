import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type Silo = {
  id: string;
  empresa_id: string | null;
  codigo: string | null;
  nome: string;
  capacidade_kg: number | null;
  capacidade_sacas: number | null;
  tipo: string | null;
  localizacao: string | null;
  observacoes: string | null;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
};

export type SiloInsert = Omit<Silo, 'id' | 'created_at' | 'updated_at'>;

export function useSilos() {
  return useQuery({
    queryKey: ['silos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('silos')
        .select(`
          *,
          empresa:empresas(id, razao_social)
        `)
        .order('nome');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSilo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (silo: SiloInsert) => {
      const { data, error } = await supabase
        .from('silos')
        .insert(silo)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['silos'] });
      toast.success('Silo criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar silo: ' + error.message);
    },
  });
}

export function useUpdateSilo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...silo }: Partial<Silo> & { id: string }) => {
      const { data, error } = await supabase
        .from('silos')
        .update(silo)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['silos'] });
      toast.success('Silo atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar silo: ' + error.message);
    },
  });
}

export function useDeleteSilo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('silos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['silos'] });
      toast.success('Silo excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir silo: ' + error.message);
    },
  });
}
