import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ContaReceber {
  id: string;
  granja_id: string;
  tenant_id: string | null;
  cliente_id: string | null;
  contrato_venda_id: string | null;
  nota_fiscal_id: string | null;
  documento: string | null;
  parcela: string | null;
  data_emissao: string;
  data_vencimento: string;
  valor_original: number;
  valor_pago: number;
  juros: number;
  multa: number;
  desconto: number;
  status: 'aberto' | 'parcial' | 'pago' | 'cancelado';
  dre_conta_id: string | null;
  sub_centro_custo_id: string | null;
  safra_id: string | null;
  observacoes: string | null;
  codigo_legado: string | null;
  created_at: string;
  updated_at: string;
}

export type ContaReceberInput = Partial<Omit<ContaReceber, 'id' | 'valor_pago' | 'status' | 'created_at' | 'updated_at' | 'tenant_id'>> & {
  granja_id: string;
  data_vencimento: string;
  valor_original: number;
  rateio_modo?: 'socio_unico' | 'rateio_granja' | 'manual';
  socio_produtor_id?: string | null;
};


interface Filtros {
  granjaId?: string;
  status?: string;
  clienteId?: string;
  contratoVendaId?: string;
  vencimentoDe?: string;
  vencimentoAte?: string;
  safraId?: string;
  busca?: string;
}

export function useContasReceber(filtros?: Filtros) {
  return useQuery({
    queryKey: ['contas_receber', filtros],
    queryFn: async () => {
      let q = supabase
        .from('contas_receber' as any)
        .select(`*,
          cliente:cliente_id(id, nome, nome_fantasia),
          contrato_venda:contrato_venda_id(id, numero),
          dre_conta:dre_conta_id(codigo, descricao),
          sub_centro_custo:sub_centro_custo_id(codigo, descricao),
          safra:safra_id(nome)
        `)
        .order('data_vencimento', { ascending: true });
      if (filtros?.granjaId) q = q.eq('granja_id', filtros.granjaId);
      if (filtros?.status) q = q.eq('status', filtros.status);
      if (filtros?.clienteId) q = q.eq('cliente_id', filtros.clienteId);
      if (filtros?.contratoVendaId) q = q.eq('contrato_venda_id', filtros.contratoVendaId);
      if (filtros?.vencimentoDe) q = q.gte('data_vencimento', filtros.vencimentoDe);
      if (filtros?.vencimentoAte) q = q.lte('data_vencimento', filtros.vencimentoAte);
      if (filtros?.safraId) q = q.eq('safra_id', filtros.safraId);
      if (filtros?.busca) q = q.ilike('documento', `%${filtros.busca}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as any[];
    },
  });
}

export function useCreateContaReceber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ContaReceberInput) => {
      const { data, error } = await supabase.from('contas_receber' as any).insert(input as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_receber'] });
      toast.success('Conta a receber criada!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useUpdateContaReceber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<ContaReceberInput> & { id: string; status?: string }) => {
      const { data, error } = await supabase.from('contas_receber' as any).update(input as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_receber'] });
      toast.success('Conta atualizada!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useDeleteContaReceber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contas_receber' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_receber'] });
      toast.success('Conta excluída!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

// Baixas
export interface BaixaContaReceber {
  id: string;
  conta_id: string;
  data_pagamento: string;
  valor_pago: number;
  juros: number;
  multa: number;
  desconto: number;
  forma_pagamento: string | null;
  conta_bancaria: string | null;
  documento: string | null;
  observacoes: string | null;
  lancamento_financeiro_id: string | null;
  numero_recibo: string | null;
}

export function useBaixasContaReceber(contaId: string | null) {
  return useQuery({
    queryKey: ['contas_receber_baixas', contaId],
    queryFn: async () => {
      if (!contaId) return [];
      const { data, error } = await supabase
        .from('contas_receber_baixas' as any)
        .select('*')
        .eq('conta_id', contaId)
        .order('data_pagamento', { ascending: true });
      if (error) throw error;
      return data as unknown as BaixaContaReceber[];
    },
    enabled: !!contaId,
  });
}

export function useCreateBaixaReceber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<BaixaContaReceber, 'id'>) => {
      const { data, error } = await supabase.from('contas_receber_baixas' as any).insert(input as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['contas_receber_baixas', vars.conta_id] });
      qc.invalidateQueries({ queryKey: ['contas_receber'] });
      toast.success('Baixa registrada!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useDeleteBaixaReceber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; conta_id: string }) => {
      const { error } = await supabase.from('contas_receber_baixas' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['contas_receber_baixas', vars.conta_id] });
      qc.invalidateQueries({ queryKey: ['contas_receber'] });
      toast.success('Baixa excluída!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

// Geração automática de parcelas a partir de contrato de venda
export interface GerarParcelasInput {
  contrato_venda_id: string;
  granja_id: string;
  cliente_id?: string | null;
  nota_fiscal_id?: string | null;
  safra_id?: string | null;
  documento?: string | null;
  valor_total: number;
  num_parcelas: number;
  primeiro_vencimento: string; // YYYY-MM-DD
  intervalo_dias: number;
  ja_pago?: boolean;
  data_emissao?: string;
  dre_conta_id?: string | null;
  sub_centro_custo_id?: string | null;
}

export function useGerarParcelasReceber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GerarParcelasInput) => {
      // Apaga parcelas existentes do contrato que estejam abertas (sem baixa)
      const { data: existentes } = await supabase
        .from('contas_receber' as any)
        .select('id, valor_pago')
        .eq('contrato_venda_id', input.contrato_venda_id);
      const removiveis = (existentes || []).filter((c: any) => Number(c.valor_pago) === 0).map((c: any) => c.id);
      if (removiveis.length) {
        await supabase.from('contas_receber' as any).delete().in('id', removiveis);
      }

      const valorParcela = Math.round((input.valor_total / input.num_parcelas) * 100) / 100;
      const ultimaAjuste = Math.round((input.valor_total - valorParcela * (input.num_parcelas - 1)) * 100) / 100;

      const base = new Date(input.primeiro_vencimento + 'T00:00:00');
      const parcelas = Array.from({ length: input.num_parcelas }).map((_, i) => {
        const d = new Date(base);
        d.setDate(d.getDate() + i * input.intervalo_dias);
        const valor = i === input.num_parcelas - 1 ? ultimaAjuste : valorParcela;
        return {
          granja_id: input.granja_id,
          cliente_id: input.cliente_id || null,
          contrato_venda_id: input.contrato_venda_id,
          nota_fiscal_id: input.nota_fiscal_id || null,
          safra_id: input.safra_id || null,
          documento: input.documento || null,
          parcela: `${i + 1}/${input.num_parcelas}`,
          data_emissao: input.data_emissao || new Date().toISOString().slice(0, 10),
          data_vencimento: d.toISOString().slice(0, 10),
          valor_original: valor,
          valor_pago: input.ja_pago ? valor : 0,
          status: input.ja_pago ? 'pago' : 'aberto',
          dre_conta_id: input.dre_conta_id || null,
          sub_centro_custo_id: input.sub_centro_custo_id || null,
        };
      });
      const { error } = await supabase.from('contas_receber' as any).insert(parcelas as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_receber'] });
      toast.success('Contas a receber geradas!');
    },
    onError: (e: any) => toast.error('Erro ao gerar parcelas: ' + e.message),
  });
}
