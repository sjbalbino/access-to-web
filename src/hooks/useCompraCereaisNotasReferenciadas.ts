import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface NotaReferenciadaCompra {
  id: string;
  compra_id: string;
  tipo: 'nfe' | 'nfp';
  chave_nfe: string | null;
  nfp_uf: string | null;
  nfp_aamm: string | null;
  nfp_cnpj: string | null;
  nfp_cpf: string | null;
  nfp_ie: string | null;
  nfp_modelo: string | null;
  nfp_serie: string | null;
  nfp_numero: string | null;
  created_at: string;
}

export type NotaReferenciadaCompraInput = Omit<NotaReferenciadaCompra, 'id' | 'created_at'>;

export function useNotasReferenciadasCompra(compraId: string | undefined) {
  return useQuery({
    queryKey: ['compras_cereais_notas_referenciadas', compraId],
    queryFn: async () => {
      if (!compraId) return [];

      const { data, error } = await supabase
        .from('compras_cereais_notas_referenciadas')
        .select('*')
        .eq('compra_id', compraId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as NotaReferenciadaCompra[];
    },
    enabled: !!compraId,
  });
}

export function useCreateNotaReferenciadaCompra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nota: NotaReferenciadaCompraInput) => {
      const { data, error } = await supabase
        .from('compras_cereais_notas_referenciadas')
        .insert(nota)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['compras_cereais_notas_referenciadas', variables.compra_id] 
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteNotaReferenciadaCompra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, compraId }: { id: string; compraId: string }) => {
      const { error } = await supabase
        .from('compras_cereais_notas_referenciadas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return compraId;
    },
    onSuccess: (compraId) => {
      queryClient.invalidateQueries({ 
        queryKey: ['compras_cereais_notas_referenciadas', compraId] 
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useSyncNotasReferenciadasCompra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      compraId, 
      notas 
    }: { 
      compraId: string; 
      notas: Omit<NotaReferenciadaCompraInput, 'compra_id'>[] 
    }) => {
      // Deletar todas as notas existentes da compra
      const { error: deleteError } = await supabase
        .from('compras_cereais_notas_referenciadas')
        .delete()
        .eq('compra_id', compraId);

      if (deleteError) throw deleteError;

      // Inserir as novas notas
      if (notas.length > 0) {
        const notasParaInserir = notas.map(nota => ({
          ...nota,
          compra_id: compraId,
        }));

        const { error: insertError } = await supabase
          .from('compras_cereais_notas_referenciadas')
          .insert(notasParaInserir);

        if (insertError) throw insertError;
      }

      return compraId;
    },
    onSuccess: (compraId) => {
      queryClient.invalidateQueries({ 
        queryKey: ['compras_cereais_notas_referenciadas', compraId] 
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao sincronizar notas referenciadas',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
