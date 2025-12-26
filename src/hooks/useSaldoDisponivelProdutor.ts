import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
 * Fórmula: Saldo = Colheitas + Transf.Recebidas - Transf.Enviadas - Devoluções - kg_Taxa_Armazenagem
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

      // Buscar colheitas (producao_liquida_kg) - filtrar por local de entrega se especificado
      let colheitasQuery = supabase
        .from('colheitas')
        .select('producao_liquida_kg')
        .eq('inscricao_produtor_id', inscricaoProdutorId)
        .eq('safra_id', safraId)
        .eq('variedade_id', produtoId);

      if (localEntregaId) {
        colheitasQuery = colheitasQuery.eq('local_entrega_terceiro_id', localEntregaId);
      }

      const { data: colheitasData, error: colheitasError } = await colheitasQuery;
      if (colheitasError) throw colheitasError;

      const totalColheitas = (colheitasData || []).reduce(
        (sum, c) => sum + (c.producao_liquida_kg || 0), 
        0
      );

      // Buscar transferências recebidas (inscricao_destino_id)
      // TODO: Se transferências também precisarem filtrar por local, adicionar aqui
      const { data: recebidosData, error: recebidosError } = await supabase
        .from('transferencias_deposito')
        .select('quantidade_kg')
        .eq('inscricao_destino_id', inscricaoProdutorId)
        .eq('safra_id', safraId)
        .eq('produto_id', produtoId);

      if (recebidosError) throw recebidosError;

      const totalRecebidas = (recebidosData || []).reduce(
        (sum, t) => sum + (t.quantidade_kg || 0), 
        0
      );

      // Buscar transferências enviadas (inscricao_origem_id)
      const { data: enviadosData, error: enviadosError } = await supabase
        .from('transferencias_deposito')
        .select('quantidade_kg')
        .eq('inscricao_origem_id', inscricaoProdutorId)
        .eq('safra_id', safraId)
        .eq('produto_id', produtoId);

      if (enviadosError) throw enviadosError;

      const totalEnviadas = (enviadosData || []).reduce(
        (sum, t) => sum + (t.quantidade_kg || 0), 
        0
      );

      // Buscar devoluções já realizadas - incluir kg_taxa_armazenagem
      // Filtrar por local de entrega se especificado
      let devolucoesQuery = supabase
        .from('devolucoes_deposito')
        .select('quantidade_kg, kg_taxa_armazenagem')
        .eq('inscricao_produtor_id', inscricaoProdutorId)
        .eq('safra_id', safraId)
        .eq('produto_id', produtoId);

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

      // Buscar notas de depósito emitidas (CFOP 1905)
      const { data: notasDepositoData, error: notasDepositoError } = await supabase
        .from('notas_deposito_emitidas')
        .select('quantidade_kg')
        .eq('inscricao_produtor_id', inscricaoProdutorId)
        .eq('safra_id', safraId)
        .eq('produto_id', produtoId);

      if (notasDepositoError) throw notasDepositoError;

      const totalNotasDeposito = (notasDepositoData || []).reduce(
        (sum, n) => sum + (n.quantidade_kg || 0), 
        0
      );

      // SALDO = Colheitas + Recebidas - Enviadas - Devoluções - kg_Taxa_Armazenagem
      // Nota: Notas de Depósito não entram no cálculo do saldo de devolução
      // pois representam outra operação (regularização fiscal), não baixa de saldo
      const saldo = totalColheitas + totalRecebidas - totalEnviadas - totalDevolucoes - totalKgTaxaArmazenagem;

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
