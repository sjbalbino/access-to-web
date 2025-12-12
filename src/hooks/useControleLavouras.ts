import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ControleLavoura {
  id: string;
  codigo: string | null;
  lavoura_id: string;
  safra_id: string;
  area_total: number | null;
  ha_plantado: number | null;
  cobertura_solo: number | null;
  created_at: string;
  updated_at: string;
  lavouras?: {
    id: string;
    nome: string;
    codigo: string | null;
    total_hectares: number | null;
  };
  safras?: {
    id: string;
    nome: string;
    codigo: string | null;
  };
}

export type ControleLavouraInput = Omit<ControleLavoura, 'id' | 'created_at' | 'updated_at' | 'lavouras' | 'safras'>;

export function useControleLavouras(safraId?: string | null, lavouraId?: string | null) {
  return useQuery({
    queryKey: ['controle_lavouras', safraId, lavouraId],
    queryFn: async () => {
      let query = supabase
        .from('controle_lavouras')
        .select(`
          *,
          lavouras:lavoura_id(id, nome, codigo, total_hectares),
          safras:safra_id(id, nome, codigo)
        `)
        .order('created_at', { ascending: false });

      if (safraId) {
        query = query.eq('safra_id', safraId);
      }
      if (lavouraId) {
        query = query.eq('lavoura_id', lavouraId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ControleLavoura[];
    },
  });
}

export function useControleLavoura(id: string | null) {
  return useQuery({
    queryKey: ['controle_lavoura', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('controle_lavouras')
        .select(`
          *,
          lavouras:lavoura_id(id, nome, codigo, total_hectares),
          safras:safra_id(id, nome, codigo)
        `)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as ControleLavoura | null;
    },
    enabled: !!id,
  });
}

export function useControleLavouraBySafraLavoura(safraId: string | null, lavouraId: string | null) {
  return useQuery({
    queryKey: ['controle_lavoura_by_safra_lavoura', safraId, lavouraId],
    queryFn: async () => {
      if (!safraId || !lavouraId) return null;
      const { data, error } = await supabase
        .from('controle_lavouras')
        .select(`
          *,
          lavouras:lavoura_id(id, nome, codigo, total_hectares),
          safras:safra_id(id, nome, codigo)
        `)
        .eq('safra_id', safraId)
        .eq('lavoura_id', lavouraId)
        .maybeSingle();
      if (error) throw error;
      return data as ControleLavoura | null;
    },
    enabled: !!safraId && !!lavouraId,
  });
}

export function useCreateControleLavoura() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ControleLavouraInput) => {
      const { data, error } = await supabase
        .from('controle_lavouras')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle_lavouras'] });
      queryClient.invalidateQueries({ queryKey: ['controle_lavoura_by_safra_lavoura'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar controle de lavoura', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateControleLavoura() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<ControleLavouraInput>) => {
      const { data, error } = await supabase
        .from('controle_lavouras')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle_lavouras'] });
      queryClient.invalidateQueries({ queryKey: ['controle_lavoura'] });
      queryClient.invalidateQueries({ queryKey: ['controle_lavoura_by_safra_lavoura'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar controle de lavoura', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteControleLavoura() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('controle_lavouras').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle_lavouras'] });
      toast({ title: 'Controle de lavoura excluído com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir controle de lavoura', description: error.message, variant: 'destructive' });
    },
  });
}
