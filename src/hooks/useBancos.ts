import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Banco {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
}

export function useBancos() {
  return useQuery({
    queryKey: ['bancos'],
    staleTime: 1000 * 60 * 60, // 1h
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bancos' as any)
        .select('id, codigo, nome, ativo')
        .eq('ativo', true)
        .order('codigo');
      if (error) throw error;
      return (data || []) as unknown as Banco[];
    },
  });
}
