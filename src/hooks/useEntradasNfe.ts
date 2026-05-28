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

export interface AutoCpDuplicata {
  numero: string;
  vencimento: string;
  valor: number;
}

export interface AutoCpPagamento {
  forma_pagamento?: string | null;
  conta_bancaria_id?: string | null;
  ja_pago?: boolean;
}

async function gerarContasPagarAutomatico(
  entrada: any,
  duplicatas: AutoCpDuplicata[] | undefined,
  pagamento: AutoCpPagamento | undefined
) {
  const valorTotal = Number(entrada.valor_total) || 0;
  if (valorTotal <= 0) return;

  const dataEmissao = entrada.data_emissao || entrada.data_entrada || new Date().toISOString().slice(0, 10);

  // Monta lista de parcelas
  let parcelas: Array<{ numero: string; vencimento: string; valor: number }>;
  if (duplicatas && duplicatas.length > 0) {
    parcelas = duplicatas.map((d, i) => ({
      numero: `${i + 1}/${duplicatas.length}`,
      vencimento: d.vencimento || dataEmissao,
      valor: d.valor,
    }));
  } else {
    // Sem duplicatas → cria 1 CP única (à vista ou prazo único)
    parcelas = [{
      numero: '1/1',
      vencimento: dataEmissao,
      valor: valorTotal,
    }];
  }

  const rows = parcelas.map((p) => ({
    granja_id: entrada.granja_id,
    fornecedor_id: entrada.fornecedor_id || null,
    entrada_nfe_id: entrada.id,
    safra_id: entrada.safra_id || null,
    socio_produtor_id: entrada.socio_produtor_id || null,
    rateio_modo: entrada.socio_produtor_id ? 'socio_unico' : 'rateio_granja',
    documento: entrada.numero_nfe || null,
    parcela: p.numero,
    data_emissao: dataEmissao,
    data_vencimento: p.vencimento,
    valor_original: p.valor,
    observacoes: pagamento?.forma_pagamento ? `Forma: ${pagamento.forma_pagamento}` : null,
  }));

  const { data: criadas, error } = await supabase
    .from('contas_pagar')
    .insert(rows)
    .select('id, valor_original');
  if (error) throw error;

  // Se "já pago" e forma de pagamento à vista → gera baixas
  if (pagamento?.ja_pago && pagamento.forma_pagamento && criadas?.length) {
    const hoje = new Date().toISOString().slice(0, 10);
    const baixas = criadas.map((c: any) => ({
      conta_id: c.id,
      data_pagamento: hoje,
      valor_pago: Number(c.valor_original),
      juros: 0,
      multa: 0,
      desconto: 0,
      forma_pagamento: pagamento.forma_pagamento,
      conta_bancaria: pagamento.conta_bancaria_id || null,
      documento: entrada.numero_nfe || null,
    }));
    const { error: errBaixa } = await supabase.from('contas_pagar_baixas').insert(baixas);
    if (errBaixa) throw errBaixa;
  }
}

export function useCreateEntradaNfe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const { itens, _duplicatas, _pagamento, ...header } = input;
      // Deriva socio_produtor_id a partir da inscricao
      if (header.inscricao_produtor_id && !header.socio_produtor_id) {
        const { data: insc } = await supabase
          .from('inscricoes_produtor')
          .select('produtor_id')
          .eq('id', header.inscricao_produtor_id)
          .maybeSingle();
        if (insc?.produtor_id) header.socio_produtor_id = insc.produtor_id;
      }
      const socioProdutorId = header.socio_produtor_id;
      delete header.socio_produtor_id; // não é coluna de entradas_nfe

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

      // Gera Contas a Pagar automaticamente
      try {
        await gerarContasPagarAutomatico(
          { ...data, socio_produtor_id: socioProdutorId },
          _duplicatas,
          _pagamento,
        );
      } catch (err: any) {
        console.error('Erro ao gerar contas a pagar automáticas:', err);
        toast.error('Entrada criada, mas falha ao gerar Contas a Pagar: ' + err.message);
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entradas_nfe'] });
      qc.invalidateQueries({ queryKey: ['contas_pagar'] });
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
