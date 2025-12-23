import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SaldoProdutorFilters {
  inscricaoProdutorId?: string;
  safraId?: string;
  produtoId?: string;
}

interface SaldoResult {
  saldo: number;
  colheitas: number;
  transferenciasRecebidas: number;
  transferenciasEnviadas: number;
}

export function useSaldoProdutor(filters: SaldoProdutorFilters) {
  return useQuery({
    queryKey: ['saldo_produtor', filters],
    queryFn: async (): Promise<SaldoResult> => {
      const { inscricaoProdutorId, safraId, produtoId } = filters;

      if (!inscricaoProdutorId || !safraId || !produtoId) {
        return { saldo: 0, colheitas: 0, transferenciasRecebidas: 0, transferenciasEnviadas: 0 };
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

      // SALDO = Colheitas + Recebidas - Enviadas
      const saldo = totalColheitas + totalRecebidas - totalEnviadas;

      return {
        saldo,
        colheitas: totalColheitas,
        transferenciasRecebidas: totalRecebidas,
        transferenciasEnviadas: totalEnviadas,
      };
    },
    enabled: Boolean(filters.inscricaoProdutorId && filters.safraId && filters.produtoId),
  });
}
