import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useEntradasNfe(granjaId?: string | null, safraId?: string | null, inscricaoId?: string | null) {
  return useQuery({
    queryKey: ['entradas_nfe', granjaId, safraId, inscricaoId],
    queryFn: async () => {
      let query = supabase
        .from('entradas_nfe')
        .select(`
          *,
          fornecedor:fornecedor_id(id, nome, cpf_cnpj),
          granja:granja_id(id, razao_social),
          safra:safra_id(id, nome),
          inscricao:inscricao_produtor_id(id, nome, inscricao_estadual)
        `)
        .order('data_entrada', { ascending: false });
      if (granjaId) query = query.eq('granja_id', granjaId);
      if (safraId) query = query.eq('safra_id', safraId);
      if (inscricaoId) query = query.eq('inscricao_produtor_id', inscricaoId);
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
  numero_cheque?: string | null;
}

async function gerarContasPagarAutomatico(
  entrada: any,
  itens: any[] | undefined,
  duplicatas: AutoCpDuplicata[] | undefined,
  pagamento: AutoCpPagamento | undefined
) {
  const valorTotal = Number(entrada.valor_total) || 0;
  if (valorTotal <= 0) return;

  const dataEmissao = entrada.data_emissao || entrada.data_entrada || new Date().toISOString().slice(0, 10);

  // 1. Determinar o rateio por conta DRE / Sub-Centro baseado nos itens
  let rateioItens: Record<string, { sub_centro_id: string | null; dre_id: string | null; valor: number }> = {};

  if (itens && itens.length > 0) {
    const produtoIds = itens.map(i => i.produto_id).filter(Boolean);
    
    const { data: produtosMeta } = await supabase
      .from('produtos')
      .select(`
        id,
        grupo:grupo_id(
          id,
          sub_centro:conta_gerencial_id(
            id,
            codigo_dre
          )
        )
      `)
      .in('id', produtoIds);

    const { data: todasDreContas } = await supabase
      .from('dre_contas')
      .select('id, codigo')
      .eq('ativo', true);

    itens.forEach(item => {
      const meta = produtosMeta?.find(p => p.id === item.produto_id);
      const subCentroId = (meta?.grupo as any)?.sub_centro?.id || null;
      const codigoDre = (meta?.grupo as any)?.sub_centro?.codigo_dre || null;
      const dreConta = todasDreContas?.find(d => d.codigo === codigoDre);
      const dreId = dreConta?.id || null;
      
      const key = `${subCentroId || 'null'}_${dreId || 'null'}`;
      if (!rateioItens[key]) {
        rateioItens[key] = { sub_centro_id: subCentroId, dre_id: dreId, valor: 0 };
      }
      rateioItens[key].valor += (Number(item.valor_total) || (Number(item.quantidade) * Number(item.valor_unitario)));
    });
  }

  const splits = Object.values(rateioItens);
  const totalValorItens = splits.reduce((sum, s) => sum + s.valor, 0);

  // Monta lista de parcelas
  let parcelas: Array<{ numero: string; vencimento: string; valor: number }>;
  if (duplicatas && duplicatas.length > 0) {
    parcelas = duplicatas.map((d, i) => ({
      numero: `${i + 1}/${duplicatas.length}`,
      vencimento: d.vencimento || dataEmissao,
      valor: Number(d.valor),
    }));
  } else {
    parcelas = [{
      numero: '1/1',
      vencimento: dataEmissao,
      valor: valorTotal,
    }];
  }

  let rows: any[] = [];
  if (splits.length === 0) {
    rows = parcelas.map((p) => ({
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
  } else {
    parcelas.forEach(p => {
      splits.forEach((s, idx) => {
        const prop = s.valor / totalValorItens;
        let valorSplit = Number((p.valor * prop).toFixed(2));
        
        if (idx === splits.length - 1) {
          const jaCalculado = rows
            .filter(r => r.parcela === p.numero)
            .reduce((sum, r) => sum + r.valor_original, 0);
          valorSplit = Number((p.valor - jaCalculado).toFixed(2));
        }

        if (valorSplit > 0) {
          rows.push({
            granja_id: entrada.granja_id,
            fornecedor_id: entrada.fornecedor_id || null,
            entrada_nfe_id: entrada.id,
            safra_id: entrada.safra_id || null,
            sub_centro_custo_id: s.sub_centro_id,
            dre_conta_id: s.dre_id,
            socio_produtor_id: entrada.socio_produtor_id || null,
            rateio_modo: entrada.socio_produtor_id ? 'socio_unico' : 'rateio_granja',
            documento: entrada.numero_nfe || null,
            parcela: p.numero,
            data_emissao: dataEmissao,
            data_vencimento: p.vencimento,
            valor_original: valorSplit,
            observacoes: pagamento?.forma_pagamento ? `Forma: ${pagamento.forma_pagamento} (Rateio DRE)` : 'Rateio DRE',
          });
        }
      });
    });
  }

  const { data: criadas, error } = await supabase
    .from('contas_pagar')
    .insert(rows)
    .select('id, valor_original');

  if (error) throw error;

  // Se "já pago" e forma de pagamento à vista → gera baixas
  if (pagamento?.ja_pago && pagamento.forma_pagamento && criadas?.length) {
    const hoje = new Date().toISOString().slice(0, 10);
    const docPagto = pagamento.forma_pagamento === 'cheque' && pagamento.numero_cheque
      ? `Cheque ${pagamento.numero_cheque}`
      : (entrada.numero_nfe || null);
    const baixas = criadas.map((c: any) => ({
      conta_id: c.id,
      data_pagamento: hoje,
      valor_pago: Number(c.valor_original),
      juros: 0,
      multa: 0,
      desconto: 0,
      forma_pagamento: pagamento.forma_pagamento,
      conta_bancaria: pagamento.conta_bancaria_id || null,
      conta_bancaria_id: pagamento.conta_bancaria_id || null,
      documento: docPagto,
    }));
    const { error: errBaixa } = await supabase.from('contas_pagar_baixas').insert(baixas);
    if (errBaixa) throw errBaixa;
  }

  return criadas;
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
          itens,
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

      // Só substitui itens quando a lista vier preenchida — evita apagar itens
      // existentes caso o formulário ainda não tenha carregado os itens.
      if (Array.isArray(itens) && itens.length > 0) {
        await supabase.from('entradas_nfe_itens').delete().eq('entrada_nfe_id', id);
        const itensWithId = itens.map((item: any) => ({
          ...item,
          entrada_nfe_id: id,
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

        // Atualizar estoque_atual agregado em produtos
        const { data: prod } = await supabase
          .from('produtos')
          .select('estoque_atual')
          .eq('id', item.produto_id)
          .maybeSingle();
        await supabase
          .from('produtos')
          .update({ estoque_atual: Number(prod?.estoque_atual || 0) + Number(qty || 0) })
          .eq('id', item.produto_id);
}

export function useEstornarEntrada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entradaId: string) => {
      // Buscar entrada + itens
      const { data: entrada, error } = await supabase
        .from('entradas_nfe')
        .select(`*, itens:entradas_nfe_itens(*)`)
        .eq('id', entradaId)
        .single();
      if (error) throw error;

      if (entrada.status !== 'finalizado') {
        throw new Error('Apenas entradas finalizadas podem ser estornadas.');
      }

      const itensVinculados = (entrada as any).itens?.filter((i: any) => i.produto_id && i.vinculado) || [];

      // Reverter estoque por granja e agregado em produtos
      for (const item of itensVinculados) {
        const qty = Number(item.quantidade_conferida ?? item.quantidade ?? 0);
        if (qty <= 0) continue;

        const { data: existing } = await supabase
          .from('estoque_produtos')
          .select('id, quantidade')
          .eq('produto_id', item.produto_id)
          .eq('granja_id', entrada.granja_id)
          .eq('lote', item.lote || '')
          .maybeSingle();

        if (existing) {
          const novaQtd = Math.max(0, Number(existing.quantidade || 0) - qty);
          await supabase.from('estoque_produtos').update({ quantidade: novaQtd }).eq('id', existing.id);
        }

        const { data: prod } = await supabase
          .from('produtos').select('estoque_atual').eq('id', item.produto_id).maybeSingle();
        await supabase.from('produtos')
          .update({ estoque_atual: Math.max(0, Number(prod?.estoque_atual || 0) - qty) })
          .eq('id', item.produto_id);
      }

      // Reabrir entrada
      await supabase.from('entradas_nfe').update({ status: 'pendente' }).eq('id', entradaId);

      // Remover contas a pagar SEM baixas geradas por esta entrada
      const { data: cps } = await supabase
        .from('contas_pagar')
        .select('id, valor_pago')
        .eq('entrada_nfe_id', entradaId);
      const semBaixa = (cps || []).filter((c: any) => Number(c.valor_pago || 0) === 0).map((c: any) => c.id);
      if (semBaixa.length) {
        await supabase.from('contas_pagar').delete().in('id', semBaixa);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entradas_nfe'] });
      qc.invalidateQueries({ queryKey: ['entrada_nfe'] });
      qc.invalidateQueries({ queryKey: ['estoque_produtos'] });
      qc.invalidateQueries({ queryKey: ['contas_pagar'] });
      toast.success('Entrada estornada e reaberta para edição!');
    },
    onError: (error: any) => {
      toast.error('Erro ao estornar entrada: ' + error.message);
    },
  });
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
