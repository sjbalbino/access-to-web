import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface NotaReferenciada {
  id: string;
  nota_fiscal_id: string;
  tipo: 'nfe' | 'nfp';
  // Para NFe
  chave_nfe: string | null;
  // Para NFP
  nfp_uf: string | null;
  nfp_aamm: string | null;
  nfp_cnpj: string | null;
  nfp_cpf: string | null;
  nfp_ie: string | null;
  nfp_modelo: string | null;
  nfp_serie: number | null;
  nfp_numero: number | null;
  created_at: string;
}

export type NotaReferenciadaInput = Omit<NotaReferenciada, 'id' | 'created_at'>;

export function useNotasReferenciadas(notaFiscalId: string | undefined) {
  return useQuery({
    queryKey: ['notas_referenciadas', notaFiscalId],
    queryFn: async () => {
      if (!notaFiscalId) return [];
      
      const { data, error } = await supabase
        .from('notas_fiscais_referenciadas')
        .select('*')
        .eq('nota_fiscal_id', notaFiscalId)
        .order('created_at');

      if (error) throw error;
      return data as NotaReferenciada[];
    },
    enabled: !!notaFiscalId,
  });
}

export function useCreateNotaReferenciada() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nota: NotaReferenciadaInput) => {
      const { data, error } = await supabase
        .from('notas_fiscais_referenciadas')
        .insert(nota)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notas_referenciadas', variables.nota_fiscal_id] });
      toast({
        title: 'Nota referenciada adicionada',
        description: 'A nota foi adicionada às referências.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao adicionar nota referenciada',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteNotaReferenciada() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notaFiscalId }: { id: string; notaFiscalId: string }) => {
      const { error } = await supabase
        .from('notas_fiscais_referenciadas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return notaFiscalId;
    },
    onSuccess: (notaFiscalId) => {
      queryClient.invalidateQueries({ queryKey: ['notas_referenciadas', notaFiscalId] });
      toast({
        title: 'Nota referenciada removida',
        description: 'A nota foi removida das referências.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover nota referenciada',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateNotaReferenciada() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notaFiscalId, data }: { 
      id: string; 
      notaFiscalId: string; 
      data: Partial<NotaReferenciadaInput> 
    }) => {
      const { error } = await supabase
        .from('notas_fiscais_referenciadas')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      return notaFiscalId;
    },
    onSuccess: (notaFiscalId) => {
      queryClient.invalidateQueries({ queryKey: ['notas_referenciadas', notaFiscalId] });
      toast({
        title: 'Nota referenciada atualizada',
        description: 'Os dados foram salvos com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar nota referenciada',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
