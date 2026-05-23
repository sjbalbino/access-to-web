import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ContaPagar {
  id: string;
  granja_id: string;
  tenant_id: string | null;
  fornecedor_id: string | null;
  entrada_nfe_id: string | null;
  compra_cereais_id: string | null;
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

export type ContaPagarInput = Partial<Omit<ContaPagar, 'id' | 'valor_pago' | 'status' | 'created_at' | 'updated_at' | 'tenant_id'>> & {
  granja_id: string;
  data_vencimento: string;
  valor_original: number;
  rateio_modo?: 'socio_unico' | 'rateio_granja' | 'manual';
  socio_produtor_id?: string | null;
};


interface Filtros {
  granjaId?: string;
  status?: string;
  fornecedorId?: string;
  entradaNfeId?: string;
  vencimentoDe?: string;
  vencimentoAte?: string;
  safraId?: string;
  busca?: string;
}

export function useContasPagar(filtros?: Filtros) {
  return useQuery({
    queryKey: ['contas_pagar', filtros],
    queryFn: async () => {
      let q = supabase
        .from('contas_pagar' as any)
        .select(`*,
          fornecedor:fornecedor_id(id, nome, nome_fantasia),
          entrada_nfe:entrada_nfe_id(id, numero_nfe, chave_acesso),
          dre_conta:dre_conta_id(codigo, descricao),
          sub_centro_custo:sub_centro_custo_id(codigo, descricao),
          safra:safra_id(nome)
        `)
        .order('data_vencimento', { ascending: true });
      if (filtros?.granjaId) q = q.eq('granja_id', filtros.granjaId);
      if (filtros?.status) q = q.eq('status', filtros.status);
      if (filtros?.fornecedorId) q = q.eq('fornecedor_id', filtros.fornecedorId);
      if (filtros?.entradaNfeId) q = q.eq('entrada_nfe_id', filtros.entradaNfeId);
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

export function useCreateContaPagar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ContaPagarInput) => {
      const { data, error } = await supabase.from('contas_pagar' as any).insert(input as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_pagar'] });
      toast.success('Conta a pagar criada!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useUpdateContaPagar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<ContaPagarInput> & { id: string; status?: string }) => {
      const { data, error } = await supabase.from('contas_pagar' as any).update(input as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_pagar'] });
      toast.success('Conta atualizada!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useDeleteContaPagar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contas_pagar' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_pagar'] });
      toast.success('Conta excluída!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export interface BaixaContaPagar {
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
}

export function useBaixasContaPagar(contaId: string | null) {
  return useQuery({
    queryKey: ['contas_pagar_baixas', contaId],
    queryFn: async () => {
      if (!contaId) return [];
      const { data, error } = await supabase
        .from('contas_pagar_baixas' as any)
        .select('*')
        .eq('conta_id', contaId)
        .order('data_pagamento', { ascending: true });
      if (error) throw error;
      return data as unknown as BaixaContaPagar[];
    },
    enabled: !!contaId,
  });
}

export function useCreateBaixaPagar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<BaixaContaPagar, 'id'>) => {
      const { data, error } = await supabase.from('contas_pagar_baixas' as any).insert(input as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['contas_pagar_baixas', vars.conta_id] });
      qc.invalidateQueries({ queryKey: ['contas_pagar'] });
      toast.success('Baixa registrada!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useDeleteBaixaPagar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; conta_id: string }) => {
      const { error } = await supabase.from('contas_pagar_baixas' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['contas_pagar_baixas', vars.conta_id] });
      qc.invalidateQueries({ queryKey: ['contas_pagar'] });
      toast.success('Baixa excluída!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export interface GerarParcelasInput {
  entrada_nfe_id?: string | null;
  compra_cereais_id?: string | null;
  granja_id: string;
  fornecedor_id?: string | null;
  documento?: string | null;
  valor_total: number;
  num_parcelas: number;
  primeiro_vencimento: string;
  intervalo_dias: number;
  data_emissao?: string;
  dre_conta_id?: string | null;
  sub_centro_custo_id?: string | null;
  safra_id?: string | null;
}

export function useGerarParcelasPagar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GerarParcelasInput) => {
      const filterField = input.entrada_nfe_id ? 'entrada_nfe_id' : 'compra_cereais_id';
      const filterValue = input.entrada_nfe_id || input.compra_cereais_id;
      if (filterValue) {
        const { data: existentes } = await supabase
          .from('contas_pagar' as any)
          .select('id, valor_pago')
          .eq(filterField, filterValue);
        const removiveis = (existentes || []).filter((c: any) => Number(c.valor_pago) === 0).map((c: any) => c.id);
        if (removiveis.length) {
          await supabase.from('contas_pagar' as any).delete().in('id', removiveis);
        }
      }

      const valorParcela = Math.round((input.valor_total / input.num_parcelas) * 100) / 100;
      const ultima = Math.round((input.valor_total - valorParcela * (input.num_parcelas - 1)) * 100) / 100;
      const base = new Date(input.primeiro_vencimento + 'T00:00:00');

      const parcelas = Array.from({ length: input.num_parcelas }).map((_, i) => {
        const d = new Date(base);
        d.setDate(d.getDate() + i * input.intervalo_dias);
        return {
          granja_id: input.granja_id,
          fornecedor_id: input.fornecedor_id || null,
          entrada_nfe_id: input.entrada_nfe_id || null,
          compra_cereais_id: input.compra_cereais_id || null,
          safra_id: input.safra_id || null,
          documento: input.documento || null,
          parcela: `${i + 1}/${input.num_parcelas}`,
          data_emissao: input.data_emissao || new Date().toISOString().slice(0, 10),
          data_vencimento: d.toISOString().slice(0, 10),
          valor_original: i === input.num_parcelas - 1 ? ultima : valorParcela,
          dre_conta_id: input.dre_conta_id || null,
          sub_centro_custo_id: input.sub_centro_custo_id || null,
        };
      });
      const { error } = await supabase.from('contas_pagar' as any).insert(parcelas as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_pagar'] });
      toast.success('Contas a pagar geradas!');
    },
    onError: (e: any) => toast.error('Erro ao gerar parcelas: ' + e.message),
  });
}
