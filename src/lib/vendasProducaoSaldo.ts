import { supabase } from '@/integrations/supabase/client';

/**
 * Calcula o total (kg) das Vendas da Produção de uma inscrição (sócio vendedor)
 * numa safra, para um conjunto de produtos equivalentes.
 *
 * Mesma abordagem usada no Extrato de Movimentação:
 * contratos_venda (inscricao_produtor_id + safra_id) -> remessas_venda não canceladas.
 *
 * Retorna 0 quando não há contratos/remessas — nunca lança para não quebrar
 * o cálculo de saldo em telas operacionais.
 */
export async function calcularVendasProducaoKg(
  inscricaoProdutorId: string,
  safraId: string,
  produtoIds: string[],
): Promise<number> {
  if (!inscricaoProdutorId || !safraId || produtoIds.length === 0) return 0;

  const { data: contratos, error: contratosError } = await supabase
    .from('contratos_venda')
    .select('id')
    .eq('inscricao_produtor_id', inscricaoProdutorId)
    .eq('safra_id', safraId);

  if (contratosError) throw contratosError;

  const contratoIds = (contratos || []).map((c: { id: string }) => c.id);
  if (contratoIds.length === 0) return 0;

  const { data: remessas, error: remessasError } = await supabase
    .from('remessas_venda')
    .select('kg_remessa')
    .in('contrato_venda_id', contratoIds)
    .in('variedade_id', produtoIds)
    .neq('status', 'cancelada');

  if (remessasError) throw remessasError;

  return Math.round(
    (remessas || []).reduce(
      (sum: number, r: { kg_remessa: number | null }) => sum + (Number(r.kg_remessa) || 0),
      0,
    ),
  );
}
