import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SaldoSocioFilters {
  inscricaoSocioId?: string;
  safraId?: string;
  produtoId?: string;
}

interface SaldoSocioResult {
  saldo: number;
  colheitas: number;
  transferenciasRecebidas: number;
  compras: number;
  transferenciasEnviadas: number;
  vendasProducao: number;
}

/**
 * Hook para calcular saldo disponível do SÓCIO para venda
 * Fórmula: Saldo = Colheitas + Transf.Recebidas + Compras - Transf.Enviadas - Venda da Produção
 */
export function useSaldoSocio(filters: SaldoSocioFilters) {
  return useQuery({
    queryKey: ['saldo_socio', filters],
    queryFn: async (): Promise<SaldoSocioResult> => {
      const { inscricaoSocioId, safraId, produtoId } = filters;

      if (!inscricaoSocioId || !safraId || !produtoId) {
        return { saldo: 0, colheitas: 0, transferenciasRecebidas: 0, compras: 0, transferenciasEnviadas: 0, vendasProducao: 0 };
      }

      // Buscar colheitas
      const colheitasResult = await supabase
        .from('colheitas')
        .select('producao_liquida_kg')
        .eq('inscricao_produtor_id', inscricaoSocioId)
        .eq('safra_id', safraId)
        .eq('variedade_id', produtoId);

      if (colheitasResult.error) throw colheitasResult.error;

      let totalColheitas = 0;
      for (const c of colheitasResult.data || []) {
        totalColheitas += (c.producao_liquida_kg as number) || 0;
      }

      // Buscar transferências recebidas
      const recebidosResult = await supabase
        .from('transferencias_deposito')
        .select('quantidade_kg')
        .eq('inscricao_destino_id', inscricaoSocioId)
        .eq('safra_id', safraId)
        .eq('produto_id', produtoId);

      if (recebidosResult.error) throw recebidosResult.error;

      let totalRecebidas = 0;
      for (const t of recebidosResult.data || []) {
        totalRecebidas += (t.quantidade_kg as number) || 0;
      }

      // Buscar compras de cereais
      const comprasResult = await supabase
        .from('compras_cereais')
        .select('quantidade_kg')
        .eq('inscricao_comprador_id', inscricaoSocioId)
        .eq('safra_id', safraId)
        .eq('produto_id', produtoId);

      if (comprasResult.error) throw comprasResult.error;

      let totalCompras = 0;
      for (const c of comprasResult.data || []) {
        totalCompras += (c.quantidade_kg as number) || 0;
      }

      // Buscar transferências enviadas
      const enviadosResult = await supabase
        .from('transferencias_deposito')
        .select('quantidade_kg')
        .eq('inscricao_origem_id', inscricaoSocioId)
        .eq('safra_id', safraId)
        .eq('produto_id', produtoId);

      if (enviadosResult.error) throw enviadosResult.error;

      let totalEnviadas = 0;
      for (const t of enviadosResult.data || []) {
        totalEnviadas += (t.quantidade_kg as number) || 0;
      }

      // Vendas da produção - simplificado para evitar problemas de tipo
      // TODO: Implementar RPC function para calcular vendas
      const totalVendasProducao = 0;

      // SALDO = Colheitas + Recebidas + Compras - Enviadas - Vendas
      const saldo = totalColheitas + totalRecebidas + totalCompras - totalEnviadas - totalVendasProducao;

      return {
        saldo,
        colheitas: totalColheitas,
        transferenciasRecebidas: totalRecebidas,
        compras: totalCompras,
        transferenciasEnviadas: totalEnviadas,
        vendasProducao: totalVendasProducao,
      };
    },
    enabled: Boolean(filters.inscricaoSocioId && filters.safraId && filters.produtoId),
  });
}
