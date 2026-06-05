import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExtratoBancario {
  id: string;
  conta_bancaria_id: string;
  data_transacao: string;
  valor: number;
  descricao: string;
  documento: string | null;
  tipo: 'entrada' | 'saida';
  fitid: string | null;
  conciliado: boolean;
  created_at: string;
}

export function useExtratosBancarios(contaBancariaId?: string) {
  return useQuery({
    queryKey: ['extratos_bancarios', contaBancariaId],
    queryFn: async () => {
      let query = supabase
        .from('extratos_bancarios' as any)
        .select('*')
        .order('data_transacao', { ascending: false });

      if (contaBancariaId) query = query.eq('conta_bancaria_id', contaBancariaId);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ExtratoBancario[];
    },
    enabled: !!contaBancariaId,
  });
}

export function useImportarExtrato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transacoes: Omit<ExtratoBancario, 'id' | 'created_at' | 'conciliado'>[]) => {
      // Inserir apenas transações que não existem (usando fitid se disponível)
      const { data, error } = await supabase
        .from('extratos_bancarios' as any)
        .upsert(transacoes, { onConflict: 'fitid', ignoreDuplicates: true });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extratos_bancarios'] });
      toast.success('Extrato importado com sucesso!');
    },
    onError: (error) => toast.error('Erro ao importar extrato: ' + error.message),
  });
}

export function useConciliarTransacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      extratoId, 
      movimentacaoId, 
      tipoMovimentacao 
    }: { 
      extratoId: string; 
      movimentacaoId: string; 
      tipoMovimentacao: 'pagar_baixa' | 'receber_baixa' | 'lancamento' 
    }) => {
      // 1. Atualizar a movimentação com o extrato_id e status conciliado
      let table = '';
      if (tipoMovimentacao === 'pagar_baixa') table = 'contas_pagar_baixas';
      else if (tipoMovimentacao === 'receber_baixa') table = 'contas_receber_baixas';
      else if (tipoMovimentacao === 'lancamento') table = 'lancamentos_financeiros';

      const { error: errorMov } = await supabase
        .from(table as any)
        .update({ conciliado: true, extrato_id: extratoId })
        .eq('id', movimentacaoId);

      if (errorMov) throw errorMov;

      // 2. Marcar a transação do extrato como conciliada
      const { error: errorExt } = await supabase
        .from('extratos_bancarios' as any)
        .update({ conciliado: true })
        .eq('id', extratoId);

      if (errorExt) throw errorExt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extratos_bancarios'] });
      queryClient.invalidateQueries({ queryKey: ['contas_pagar'] });
      queryClient.invalidateQueries({ queryKey: ['contas_receber'] });
      queryClient.invalidateQueries({ queryKey: ['lancamentos_financeiros'] });
      toast.success('Transação conciliada com sucesso!');
    },
    onError: (error) => toast.error('Erro ao conciliar: ' + error.message),
  });
}
