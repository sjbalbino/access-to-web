import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubCentroCusto {
  id: string;
  centro_custo_id: string;
  codigo: string;
  descricao: string;
  codigo_dre: string | null;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
}

export type SubCentroCustoInput = Omit<SubCentroCusto, 'id' | 'created_at' | 'updated_at'>;

export function useSubCentrosCusto(centroCustoId?: string) {
  return useQuery({
    queryKey: ['sub_centros_custo', centroCustoId],
    queryFn: async () => {
      let query = supabase.from('sub_centros_custo' as any).select('*').order('codigo');
      if (centroCustoId) query = query.eq('centro_custo_id', centroCustoId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as SubCentroCusto[];
    },
  });
}

export function useAllSubCentrosCusto() {
  return useQuery({
    queryKey: ['sub_centros_custo', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_centros_custo' as any)
        .select('*, plano_contas_gerencial:centro_custo_id(codigo, descricao, tipo)')
        .order('codigo');
      if (error) throw error;
      return data as unknown as (SubCentroCusto & { plano_contas_gerencial: { codigo: string; descricao: string; tipo: string } })[];
    },
  });
}

export function useCreateSubCentroCusto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubCentroCustoInput) => {
      const { data, error } = await supabase.from('sub_centros_custo' as any).insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub_centros_custo'] });
      toast.success('Sub-centro criado com sucesso!');
    },
    onError: (error) => toast.error('Erro ao criar sub-centro: ' + error.message),
  });
}

export function useUpdateSubCentroCusto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<SubCentroCustoInput> & { id: string }) => {
      const { data, error } = await supabase.from('sub_centros_custo' as any).update(input).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub_centros_custo'] });
      toast.success('Sub-centro atualizado com sucesso!');
    },
    onError: (error) => toast.error('Erro ao atualizar sub-centro: ' + error.message),
  });
}

export function useDeleteSubCentroCusto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sub_centros_custo' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub_centros_custo'] });
      toast.success('Sub-centro excluído com sucesso!');
    },
    onError: (error) => toast.error('Erro ao excluir sub-centro: ' + error.message),
  });
}
