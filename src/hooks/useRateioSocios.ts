import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type OrigemTipo = 'lancamento' | 'cp' | 'cr' | 'cp_baixa' | 'cr_baixa';

export interface RateioSocio {
  id: string;
  origem_tipo: OrigemTipo;
  origem_id: string;
  socio_produtor_id: string;
  percentual: number;
  valor: number;
  tenant_id: string | null;
}

export function useRateioSocios(origem_tipo?: OrigemTipo, origem_id?: string | null) {
  return useQuery({
    queryKey: ['lancamento_rateio_socios', origem_tipo, origem_id],
    queryFn: async () => {
      if (!origem_tipo || !origem_id) return [];
      const { data, error } = await supabase
        .from('lancamento_rateio_socios' as any)
        .select('*, produtor:socio_produtor_id(id, nome, cpf_cnpj)')
        .eq('origem_tipo', origem_tipo)
        .eq('origem_id', origem_id);
      if (error) throw error;
      return data as unknown as any[];
    },
    enabled: !!origem_tipo && !!origem_id,
  });
}

/** Grava o rateio MANUAL de uma origem (modo='manual'). Substitui o existente. */
export function useSalvarRateioManual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      origem_tipo: OrigemTipo;
      origem_id: string;
      itens: { socio_produtor_id: string; percentual: number; valor: number }[];
    }) => {
      await supabase
        .from('lancamento_rateio_socios' as any)
        .delete()
        .eq('origem_tipo', input.origem_tipo)
        .eq('origem_id', input.origem_id);
      if (input.itens.length === 0) return;
      const { error } = await supabase
        .from('lancamento_rateio_socios' as any)
        .insert(
          input.itens.map((i) => ({
            origem_tipo: input.origem_tipo,
            origem_id: input.origem_id,
            socio_produtor_id: i.socio_produtor_id,
            percentual: i.percentual,
            valor: i.valor,
          })) as any
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamento_rateio_socios'] });
      toast.success('Rateio salvo!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

/** Busca todos os rateios em um período, para relatórios. */
export function useRateiosPorPeriodo(filtros: {
  granjaId?: string;
  socioId?: string;
  dataInicial?: string;
  dataFinal?: string;
  safraId?: string;
}) {
  return useQuery({
    queryKey: ['rateios_periodo', filtros],
    queryFn: async () => {
      // Carrega todas as origens financeiras e seus rateios; agregação faz no frontend
      const [lanc, cp, cr, cpB, crB] = await Promise.all([
        supabase
          .from('lancamentos_financeiros' as any)
          .select('id, granja_id, data_lancamento, descricao, valor, tipo, documento, dre_conta_id, safra_id, dre_contas:dre_conta_id(codigo, descricao)')
          .then(({ data }) => data || []),
        supabase
          .from('contas_pagar' as any)
          .select('id, granja_id, data_emissao, documento, parcela, valor_original, safra_id, dre_conta_id, dre_conta:dre_conta_id(codigo, descricao)')
          .then(({ data }) => data || []),
        supabase
          .from('contas_receber' as any)
          .select('id, granja_id, data_emissao, documento, parcela, valor_original, safra_id, dre_conta_id, dre_conta:dre_conta_id(codigo, descricao)')
          .then(({ data }) => data || []),
        supabase
          .from('contas_pagar_baixas' as any)
          .select('id, conta_id, data_pagamento, valor_pago, juros, multa, desconto, documento, conta:conta_id(granja_id, documento, dre_conta_id, safra_id, dre_conta:dre_conta_id(codigo, descricao))')
          .then(({ data }) => data || []),
        supabase
          .from('contas_receber_baixas' as any)
          .select('id, conta_id, data_pagamento, valor_pago, juros, multa, desconto, documento, conta:conta_id(granja_id, documento, dre_conta_id, safra_id, dre_conta:dre_conta_id(codigo, descricao))')
          .then(({ data }) => data || []),
      ]);

      const { data: rateios } = await supabase
        .from('lancamento_rateio_socios' as any)
        .select('*, produtor:socio_produtor_id(id, nome, cpf_cnpj, granja_id)');

      return {
        lancamentos: lanc as any[],
        cp: cp as any[],
        cr: cr as any[],
        cpBaixas: cpB as any[],
        crBaixas: crB as any[],
        rateios: (rateios || []) as any[],
      };
    },
  });
}
