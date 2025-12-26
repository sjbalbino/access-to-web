import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SaldoDeposito {
  inscricao_produtor_id: string;
  produto_id: string;
  safra_id: string;
  produto_nome: string;
  depositado_kg: number;
  transferencias_recebidas_kg: number;
  notas_emitidas_kg: number;
  saldo_a_emitir_kg: number;
}

export interface SaldoDepositoFilters {
  inscricaoProdutorId?: string;
  safraId?: string;
  granjaId?: string;
}

export function useSaldosDeposito(filters: SaldoDepositoFilters) {
  return useQuery({
    queryKey: ['saldos_deposito', filters],
    queryFn: async () => {
      if (!filters.inscricaoProdutorId || !filters.safraId) {
        return [];
      }

      // Buscar colheitas (depositado)
      const { data: colheitas, error: colheitasError } = await supabase
        .from('colheitas')
        .select(`
          variedade_id,
          producao_liquida_kg,
          produto:produtos!colheitas_variedade_id_fkey(id, nome)
        `)
        .eq('inscricao_produtor_id', filters.inscricaoProdutorId)
        .eq('safra_id', filters.safraId);

      if (colheitasError) throw colheitasError;

      // Buscar transferências recebidas
      const { data: transferencias, error: transferenciasError } = await supabase
        .from('transferencias_deposito')
        .select(`
          produto_id,
          quantidade_kg,
          produto:produtos(id, nome)
        `)
        .eq('inscricao_destino_id', filters.inscricaoProdutorId)
        .eq('safra_id', filters.safraId);

      if (transferenciasError) throw transferenciasError;

      // Buscar notas de depósito emitidas
      const { data: notasEmitidas, error: notasError } = await supabase
        .from('notas_deposito_emitidas')
        .select(`
          produto_id,
          quantidade_kg,
          produto:produtos(id, nome)
        `)
        .eq('inscricao_produtor_id', filters.inscricaoProdutorId)
        .eq('safra_id', filters.safraId);

      if (notasError) throw notasError;

      // Agrupar por produto
      const saldosPorProduto = new Map<string, SaldoDeposito>();

      // Adicionar colheitas
      colheitas?.forEach((c: any) => {
        const produtoId = c.variedade_id;
        if (!produtoId) return;
        
        const existing = saldosPorProduto.get(produtoId) || {
          inscricao_produtor_id: filters.inscricaoProdutorId!,
          produto_id: produtoId,
          safra_id: filters.safraId!,
          produto_nome: c.produto?.nome || 'Produto não identificado',
          depositado_kg: 0,
          transferencias_recebidas_kg: 0,
          notas_emitidas_kg: 0,
          saldo_a_emitir_kg: 0,
        };
        
        existing.depositado_kg += Number(c.producao_liquida_kg) || 0;
        saldosPorProduto.set(produtoId, existing);
      });

      // Adicionar transferências recebidas
      transferencias?.forEach((t: any) => {
        const produtoId = t.produto_id;
        if (!produtoId) return;
        
        const existing = saldosPorProduto.get(produtoId) || {
          inscricao_produtor_id: filters.inscricaoProdutorId!,
          produto_id: produtoId,
          safra_id: filters.safraId!,
          produto_nome: t.produto?.nome || 'Produto não identificado',
          depositado_kg: 0,
          transferencias_recebidas_kg: 0,
          notas_emitidas_kg: 0,
          saldo_a_emitir_kg: 0,
        };
        
        existing.transferencias_recebidas_kg += Number(t.quantidade_kg) || 0;
        saldosPorProduto.set(produtoId, existing);
      });

      // Subtrair notas emitidas
      notasEmitidas?.forEach((n: any) => {
        const produtoId = n.produto_id;
        if (!produtoId) return;
        
        const existing = saldosPorProduto.get(produtoId);
        if (existing) {
          existing.notas_emitidas_kg += Number(n.quantidade_kg) || 0;
        }
      });

      // Calcular saldo a emitir
      const saldos = Array.from(saldosPorProduto.values()).map(s => ({
        ...s,
        saldo_a_emitir_kg: s.depositado_kg + s.transferencias_recebidas_kg - s.notas_emitidas_kg,
      }));

      return saldos.filter(s => s.depositado_kg > 0 || s.transferencias_recebidas_kg > 0);
    },
    enabled: !!filters.inscricaoProdutorId && !!filters.safraId,
  });
}

// Hook para buscar todas as inscrições com saldo disponível
// IMPORTANTE: Filtra apenas produtores (não sócios) para notas de depósito
export function useInscricoesComSaldo(filters: { safraId?: string; granjaId?: string; produtoId?: string }) {
  return useQuery({
    queryKey: ['inscricoes_com_saldo', filters],
    queryFn: async () => {
      if (!filters.safraId) return [];

      // Buscar todas as colheitas da safra
      // Incluir tipo_produtor do produtor para filtrar apenas produtores
      let colheitasQuery = supabase
        .from('colheitas')
        .select(`
          inscricao_produtor_id,
          producao_liquida_kg,
          variedade_id,
          inscricao_produtor:inscricoes_produtor!colheitas_inscricao_produtor_id_fkey(
            id,
            inscricao_estadual,
            cpf_cnpj,
            granja,
            granja_id,
            produtores(nome, tipo_produtor)
          )
        `)
        .eq('safra_id', filters.safraId)
        .not('inscricao_produtor_id', 'is', null);

      // Filtrar por produto se especificado
      if (filters.produtoId) {
        colheitasQuery = colheitasQuery.eq('variedade_id', filters.produtoId);
      }

      const { data: colheitas, error } = await colheitasQuery;
      if (error) throw error;

      // Agrupar por inscrição
      const inscricaoMap = new Map<string, {
        id: string;
        inscricao_estadual: string | null;
        cpf_cnpj: string | null;
        granja: string | null;
        granja_id: string | null;
        produtor_nome: string | null;
        total_depositado: number;
      }>();

      colheitas?.forEach((c: any) => {
        const inscId = c.inscricao_produtor_id;
        if (!inscId || !c.inscricao_produtor) return;
        
        // Filtrar apenas produtores (não sócios) - notas de depósito são apenas para produtores
        const tipoProdutor = c.inscricao_produtor.produtores?.tipo_produtor;
        if (tipoProdutor !== 'produtor') {
          return;
        }
        
        // Filtrar por granja se especificado
        if (filters.granjaId && c.inscricao_produtor.granja_id !== filters.granjaId) {
          return;
        }

        const existing = inscricaoMap.get(inscId);
        if (existing) {
          existing.total_depositado += Number(c.producao_liquida_kg) || 0;
        } else {
          inscricaoMap.set(inscId, {
            id: inscId,
            inscricao_estadual: c.inscricao_produtor.inscricao_estadual,
            cpf_cnpj: c.inscricao_produtor.cpf_cnpj,
            granja: c.inscricao_produtor.granja,
            granja_id: c.inscricao_produtor.granja_id,
            produtor_nome: c.inscricao_produtor.produtores?.nome || null,
            total_depositado: Number(c.producao_liquida_kg) || 0,
          });
        }
      });

      return Array.from(inscricaoMap.values()).filter(i => i.total_depositado > 0);
    },
    enabled: !!filters.safraId,
  });
}
