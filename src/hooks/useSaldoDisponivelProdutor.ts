import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveSaldoProdutoIds } from '@/lib/produtoSaldo';

interface SaldoDisponivelProdutorFilters {
  inscricaoProdutorId?: string;
  safraId?: string;
  produtoId?: string;
  localEntregaId?: string;
}

interface SaldoDisponivelResult {
  saldo: number;
  colheitas: number;
  transferenciasRecebidas: number;
  transferenciasEnviadas: number;
  devolucoes: number;
  kgTaxaArmazenagem: number;
  notasDeposito: number; // Notas de depósito emitidas (CFOP 1905)
}

/**
 * Hook para calcular saldo disponível do PRODUTOR para devolução
 * Fórmula: Saldo = Colheitas + Transf.Recebidas - Transf.Enviadas - Devoluções - kg_Taxa_Armazenagem - Notas de Depósito
 * Agrupado por: Inscrição + Safra + Produto + Local de Entrega
 */
export function useSaldoDisponivelProdutor(filters: SaldoDisponivelProdutorFilters) {
  return useQuery({
    queryKey: ['saldo_disponivel_produtor', filters],
    queryFn: async (): Promise<SaldoDisponivelResult> => {
      const { inscricaoProdutorId, safraId, produtoId, localEntregaId } = filters;

      if (!inscricaoProdutorId || !safraId || !produtoId) {
        return { saldo: 0, colheitas: 0, transferenciasRecebidas: 0, transferenciasEnviadas: 0, devolucoes: 0, kgTaxaArmazenagem: 0, notasDeposito: 0 };
      }

      const produtoIds = await resolveSaldoProdutoIds(produtoId);

      let colheitasQuery = supabase
        .from('colheitas')
        .select('producao_liquida_kg')
        .eq('inscricao_produtor_id', inscricaoProdutorId)
        .eq('safra_id', safraId)
        .in('variedade_id', produtoIds);

      if (localEntregaId) {
        colheitasQuery = colheitasQuery.eq('local_entrega_terceiro_id', localEntregaId);
      }

      const { data: colheitasData, error: colheitasError } = await colheitasQuery;
      if (colheitasError) throw colheitasError;

      const totalColheitas = (colheitasData || []).reduce(
        (sum, c) => sum + (c.producao_liquida_kg || 0),
        0
      );

      let recebidosQuery = supabase
        .from('transferencias_deposito')
        .select('quantidade_kg')
        .eq('inscricao_destino_id', inscricaoProdutorId)
        .eq('safra_id', safraId)
        .in('produto_id', produtoIds);

      if (localEntregaId) {
        recebidosQuery = recebidosQuery.eq('local_entrada_id', localEntregaId);
      }

      const { data: recebidosData, error: recebidosError } = await recebidosQuery;

      if (recebidosError) throw recebidosError;

      const totalRecebidas = (recebidosData || []).reduce(
        (sum, t) => sum + (t.quantidade_kg || 0),
        0
      );

      let enviadosQuery = supabase
        .from('transferencias_deposito')
        .select('quantidade_kg')
        .eq('inscricao_origem_id', inscricaoProdutorId)
        .eq('safra_id', safraId)
        .in('produto_id', produtoIds);

      if (localEntregaId) {
        enviadosQuery = enviadosQuery.eq('local_saida_id', localEntregaId);
      }

      const { data: enviadosData, error: enviadosError } = await enviadosQuery;

      const totalEnviadas = (enviadosData || []).reduce(
        (sum, t) => sum + (t.quantidade_kg || 0),
        0
      );

      let devolucoesQuery = supabase
        .from('devolucoes_deposito')
        .select('quantidade_kg, kg_taxa_armazenagem')
        .eq('inscricao_produtor_id', inscricaoProdutorId)
        .eq('safra_id', safraId)
        .in('produto_id', produtoIds)
        .neq('status', 'cancelada');

      if (localEntregaId) {
        devolucoesQuery = devolucoesQuery.eq('local_entrega_id', localEntregaId);
      }

      const { data: devolucoesData, error: devolucoesError } = await devolucoesQuery;
      if (devolucoesError) throw devolucoesError;

      const totalDevolucoes = (devolucoesData || []).reduce(
        (sum, d) => sum + (d.quantidade_kg || 0),
        0
      );

      const totalKgTaxaArmazenagem = (devolucoesData || []).reduce(
        (sum, d) => sum + (d.kg_taxa_armazenagem || 0),
        0
      );

      const { data: notasDepositoData, error: notasDepositoError } = await supabase
        .from('notas_deposito_emitidas')
        .select('quantidade_kg, nota_fiscal_id')
        .eq('inscricao_produtor_id', inscricaoProdutorId)
        .eq('safra_id', safraId)
        .in('produto_id', produtoIds);

      if (notasDepositoError) throw notasDepositoError;

      let notasFiltradas = notasDepositoData || [];
      const notaFiscalIds = notasFiltradas.map((n: any) => n.nota_fiscal_id).filter(Boolean);
      if (notaFiscalIds.length > 0) {
        const { data: nfCanceladas, error: nfCanceladasError } = await supabase
          .from('notas_fiscais')
          .select('id')
          .in('id', notaFiscalIds)
          .eq('status', 'cancelada');

        if (nfCanceladasError) throw nfCanceladasError;

        const canceladasSet = new Set((nfCanceladas || []).map((n: any) => n.id));
        if (canceladasSet.size > 0) {
          notasFiltradas = notasFiltradas.filter(
            (n: any) => !n.nota_fiscal_id || !canceladasSet.has(n.nota_fiscal_id)
          );
        }
      }

      const totalNotasDeposito = notasFiltradas.reduce(
        (sum: number, n: any) => sum + (n.quantidade_kg || 0),
        0
      );

      const saldo = totalColheitas + totalRecebidas - totalEnviadas - totalDevolucoes - totalKgTaxaArmazenagem - totalNotasDeposito;

      return {
        saldo,
        colheitas: totalColheitas,
        transferenciasRecebidas: totalRecebidas,
        transferenciasEnviadas: totalEnviadas,
        devolucoes: totalDevolucoes,
        kgTaxaArmazenagem: totalKgTaxaArmazenagem,
        notasDeposito: totalNotasDeposito,
      };
    },
    enabled: Boolean(filters.inscricaoProdutorId && filters.safraId && filters.produtoId),
  });
}

