import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SaldoDisponivelProdutorFilters {
  inscricaoProdutorId?: string;
  safraId?: string;
  produtoId?: string;
}

interface SaldoDisponivelResult {
  saldo: number;
  colheitas: number;
  transferenciasRecebidas: number;
  transferenciasEnviadas: number;
  devolucoes: number;
}

/**
 * Hook para calcular saldo disponível do PRODUTOR para devolução
 * Fórmula: Saldo = Colheitas + Transf.Recebidas - Transf.Enviadas - Devoluções
 */
export function useSaldoDisponivelProdutor(filters: SaldoDisponivelProdutorFilters) {
  return useQuery({
    queryKey: ['saldo_disponivel_produtor', filters],
    queryFn: async (): Promise<SaldoDisponivelResult> => {
      const { inscricaoProdutorId, safraId, produtoId } = filters;

      if (!inscricaoProdutorId || !safraId || !produtoId) {
        return { saldo: 0, colheitas: 0, transferenciasRecebidas: 0, transferenciasEnviadas: 0, devolucoes: 0 };
      }

      // Buscar colheitas (producao_liquida_kg)
      const { data: colheitasData, error: colheitasError } = await supabase
        .from('colheitas')
        .select('producao_liquida_kg')
        .eq('inscricao_produtor_id', inscricaoProdutorId)
        .eq('safra_id', safraId)
        .eq('variedade_id', produtoId);

      if (colheitasError) throw colheitasError;

      const totalColheitas = (colheitasData || []).reduce(
        (sum, c) => sum + (c.producao_liquida_kg || 0), 
        0
      );

      // Buscar transferências recebidas (inscricao_destino_id)
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

      // Buscar devoluções já realizadas
      const { data: devolucoesData, error: devolucoesError } = await supabase
        .from('devolucoes_deposito')
        .select('quantidade_kg')
        .eq('inscricao_produtor_id', inscricaoProdutorId)
        .eq('safra_id', safraId)
        .eq('produto_id', produtoId);

      if (devolucoesError) throw devolucoesError;

      const totalDevolucoes = (devolucoesData || []).reduce(
        (sum, d) => sum + (d.quantidade_kg || 0), 
        0
      );

      // SALDO = Colheitas + Recebidas - Enviadas - Devoluções
      const saldo = totalColheitas + totalRecebidas - totalEnviadas - totalDevolucoes;

      return {
        saldo,
        colheitas: totalColheitas,
        transferenciasRecebidas: totalRecebidas,
        transferenciasEnviadas: totalEnviadas,
        devolucoes: totalDevolucoes,
      };
    },
    enabled: Boolean(filters.inscricaoProdutorId && filters.safraId && filters.produtoId),
  });
}
