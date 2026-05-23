import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/** Busca a contra-nota (entrada_nfe) vinculada a um contrato de venda */
export function useContraNotaPorContrato(contratoId?: string | null) {
  return useQuery({
    queryKey: ['contra_nota_contrato', contratoId],
    queryFn: async () => {
      if (!contratoId) return null;
      const { data, error } = await supabase
        .from('entradas_nfe')
        .select('id, numero_nfe, serie, chave_acesso, data_emissao, valor_total, fornecedor:fornecedor_id(id, nome, cpf_cnpj)')
        .eq('contrato_venda_id', contratoId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!contratoId,
  });
}

/** Entradas NFe candidatas à vinculação (filtra por granja e opcionalmente fornecedor) */
export function useEntradasCandidatas(granjaId?: string | null, fornecedorId?: string | null) {
  return useQuery({
    queryKey: ['entradas_candidatas_contra_nota', granjaId, fornecedorId],
    queryFn: async () => {
      if (!granjaId) return [];
      let q = supabase
        .from('entradas_nfe')
        .select('id, numero_nfe, serie, chave_acesso, data_emissao, valor_total, contrato_venda_id, fornecedor:fornecedor_id(id, nome, cpf_cnpj)')
        .eq('granja_id', granjaId)
        .is('contrato_venda_id', null)
        .order('data_emissao', { ascending: false })
        .limit(100);
      if (fornecedorId) q = q.eq('fornecedor_id', fornecedorId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!granjaId,
  });
}

export function useVincularContraNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { entradaId: string; contratoId: string }) => {
      const { error } = await supabase
        .from('entradas_nfe')
        .update({ contrato_venda_id: input.contratoId, eh_contra_nota: true })
        .eq('id', input.entradaId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contra_nota_contrato'] });
      qc.invalidateQueries({ queryKey: ['entradas_candidatas_contra_nota'] });
      qc.invalidateQueries({ queryKey: ['contas_receber'] });
      qc.invalidateQueries({ queryKey: ['entradas_nfe'] });
      toast.success('Contra-nota vinculada! Receita IR atualizada.');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useDesvincularContraNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entradaId: string) => {
      const { error } = await supabase
        .from('entradas_nfe')
        .update({ contrato_venda_id: null, eh_contra_nota: false })
        .eq('id', entradaId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contra_nota_contrato'] });
      qc.invalidateQueries({ queryKey: ['entradas_candidatas_contra_nota'] });
      qc.invalidateQueries({ queryKey: ['contas_receber'] });
      qc.invalidateQueries({ queryKey: ['entradas_nfe'] });
      toast.success('Contra-nota desvinculada.');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}
