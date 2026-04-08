import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useEntradasNfe(granjaId?: string | null) {
  return useQuery({
    queryKey: ['entradas_nfe', granjaId],
    queryFn: async () => {
      let query = supabase
        .from('entradas_nfe')
        .select(`
          *,
          fornecedor:fornecedor_id(id, nome, cpf_cnpj),
          granja:granja_id(id, razao_social)
        `)
        .order('data_entrada', { ascending: false });
      if (granjaId) query = query.eq('granja_id', granjaId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useEntradaNfe(id: string | null) {
  return useQuery({
    queryKey: ['entrada_nfe', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('entradas_nfe')
        .select(`
          *,
          fornecedor:fornecedor_id(id, nome, cpf_cnpj),
          granja:granja_id(id, razao_social),
          itens:entradas_nfe_itens(
            *,
            produto:produto_id(id, nome, codigo, ncm, cod_fornecedor)
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateEntradaNfe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const { itens, ...header } = input;
      const { data, error } = await supabase
        .from('entradas_nfe')
        .insert(header)
        .select()
        .single();
      if (error) throw error;

      if (itens?.length) {
        const itensWithId = itens.map((item: any) => ({
          ...item,
          entrada_nfe_id: data.id,
        }));
        const { error: itensError } = await supabase
          .from('entradas_nfe_itens')
          .insert(itensWithId);
        if (itensError) throw itensError;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entradas_nfe'] });
      toast.success('Entrada de NF-e criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar entrada: ' + error.message);
    },
  });
}

export function useUpdateEntradaNfe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, itens, ...input }: any) => {
      const { data, error } = await supabase
        .from('entradas_nfe')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      if (itens) {
        // Remove itens antigos e insere novos
        await supabase.from('entradas_nfe_itens').delete().eq('entrada_nfe_id', id);
        if (itens.length) {
          const itensWithId = itens.map((item: any) => ({
            ...item,
            entrada_nfe_id: id,
          }));
          const { error: itensError } = await supabase
            .from('entradas_nfe_itens')
            .insert(itensWithId);
          if (itensError) throw itensError;
        }
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entradas_nfe'] });
      qc.invalidateQueries({ queryKey: ['entrada_nfe'] });
      toast.success('Entrada atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar entrada: ' + error.message);
    },
  });
}

export function useDeleteEntradaNfe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('entradas_nfe').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entradas_nfe'] });
      toast.success('Entrada excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir entrada: ' + error.message);
    },
  });
}

export function useFinalizarEntrada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entradaId: string) => {
      // Buscar entrada e itens
      const { data: entrada, error } = await supabase
        .from('entradas_nfe')
        .select(`*, itens:entradas_nfe_itens(*)`)
        .eq('id', entradaId)
        .single();
      if (error) throw error;

      const itensVinculados = (entrada as any).itens?.filter((i: any) => i.produto_id && i.vinculado);
      if (!itensVinculados?.length) {
        throw new Error('Nenhum item vinculado a produto para dar entrada no estoque.');
      }

      // Para cada item vinculado, verificar se já existe estoque e somar
      for (const item of itensVinculados) {
        const qty = item.quantidade_conferida ?? item.quantidade;
        const { data: existing } = await supabase
          .from('estoque_produtos')
          .select('id, quantidade')
          .eq('produto_id', item.produto_id)
          .eq('granja_id', entrada.granja_id)
          .eq('lote', item.lote || '')
          .maybeSingle();

        if (existing) {
          await supabase
            .from('estoque_produtos')
            .update({ quantidade: (existing.quantidade || 0) + qty, custo_unitario: item.valor_unitario })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('estoque_produtos')
            .insert({
              produto_id: item.produto_id,
              granja_id: entrada.granja_id,
              quantidade: qty,
              custo_unitario: item.valor_unitario,
              lote: item.lote || null,
              data_validade: item.data_validade || null,
            });
        }
      }

      // Atualizar status
      await supabase.from('entradas_nfe').update({ status: 'finalizado' }).eq('id', entradaId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entradas_nfe'] });
      qc.invalidateQueries({ queryKey: ['entrada_nfe'] });
      qc.invalidateQueries({ queryKey: ['estoque_produtos'] });
      toast.success('Entrada finalizada e estoque atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao finalizar entrada: ' + error.message);
    },
  });
}
