import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type Placa = {
  id: string;
  granja_id: string | null;
  placa: string;
  tipo: string | null;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  cor: string | null;
  capacidade_kg: number | null;
  proprietario: string | null;
  observacoes: string | null;
  ativa: boolean | null;
  created_at: string;
  updated_at: string;
};

export type PlacaInsert = Omit<Placa, 'id' | 'created_at' | 'updated_at'>;

export function usePlacas() {
  return useQuery({
    queryKey: ['placas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('placas')
        .select(`
          *,
          granja:granjas(id, razao_social)
        `)
        .order('placa');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePlaca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (placa: PlacaInsert) => {
      const { data, error } = await supabase
        .from('placas')
        .insert(placa)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placas'] });
      toast.success('Placa criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar placa: ' + error.message);
    },
  });
}

export function useUpdatePlaca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...placa }: Partial<Placa> & { id: string }) => {
      const { data, error } = await supabase
        .from('placas')
        .update(placa)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placas'] });
      toast.success('Placa atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar placa: ' + error.message);
    },
  });
}

export function useDeletePlaca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('placas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placas'] });
      toast.success('Placa excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir placa: ' + error.message);
    },
  });
}
