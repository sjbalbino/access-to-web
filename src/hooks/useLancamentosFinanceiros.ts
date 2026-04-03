import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LancamentoFinanceiro {
  id: string;
  granja_id: string;
  data_lancamento: string;
  sub_centro_custo_id: string | null;
  dre_conta_id: string | null;
  descricao: string;
  valor: number;
  tipo: string;
  fornecedor_id: string | null;
  documento: string | null;
  observacoes: string | null;
  safra_id: string | null;
  created_at: string;
  updated_at: string;
}

export type LancamentoFinanceiroInput = Omit<LancamentoFinanceiro, 'id' | 'created_at' | 'updated_at'>;

interface FiltrosLancamento {
  granjaId?: string;
  dataInicial?: string;
  dataFinal?: string;
  tipo?: string;
  subCentroCustoId?: string;
  safraId?: string;
}

export function useLancamentosFinanceiros(filtros?: FiltrosLancamento) {
  return useQuery({
    queryKey: ['lancamentos_financeiros', filtros],
    queryFn: async () => {
      let query = supabase
        .from('lancamentos_financeiros' as any)
        .select(`
          *,
          granjas:granja_id(razao_social),
          sub_centros_custo:sub_centro_custo_id(codigo, descricao, plano_contas_gerencial:centro_custo_id(codigo, descricao)),
          dre_contas:dre_conta_id(codigo, descricao),
          clientes_fornecedores:fornecedor_id(nome, nome_fantasia),
          safras:safra_id(nome)
        `)
        .order('data_lancamento', { ascending: false });

      if (filtros?.granjaId) query = query.eq('granja_id', filtros.granjaId);
      if (filtros?.dataInicial) query = query.gte('data_lancamento', filtros.dataInicial);
      if (filtros?.dataFinal) query = query.lte('data_lancamento', filtros.dataFinal);
      if (filtros?.tipo) query = query.eq('tipo', filtros.tipo);
      if (filtros?.subCentroCustoId) query = query.eq('sub_centro_custo_id', filtros.subCentroCustoId);
      if (filtros?.safraId) query = query.eq('safra_id', filtros.safraId);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as any[];
    },
  });
}

export function useCreateLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LancamentoFinanceiroInput) => {
      const { data, error } = await supabase.from('lancamentos_financeiros' as any).insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos_financeiros'] });
      toast.success('Lançamento criado com sucesso!');
    },
    onError: (error) => toast.error('Erro ao criar lançamento: ' + error.message),
  });
}

export function useUpdateLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<LancamentoFinanceiroInput> & { id: string }) => {
      const { data, error } = await supabase.from('lancamentos_financeiros' as any).update(input).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos_financeiros'] });
      toast.success('Lançamento atualizado com sucesso!');
    },
    onError: (error) => toast.error('Erro ao atualizar lançamento: ' + error.message),
  });
}

export function useDeleteLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lancamentos_financeiros' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos_financeiros'] });
      toast.success('Lançamento excluído com sucesso!');
    },
    onError: (error) => toast.error('Erro ao excluir lançamento: ' + error.message),
  });
}
