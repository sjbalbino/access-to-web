import { supabase } from '@/integrations/supabase/client';

const LEGACY_SALDO_PREFIXES = ['SOJA'];

function normalizeProdutoNome(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function getLegacySaldoPrefix(nome: string | null | undefined) {
  const normalized = normalizeProdutoNome(nome);

  return (
    LEGACY_SALDO_PREFIXES.find(
      (prefix) => normalized === prefix || normalized.startsWith(`${prefix} `)
    ) || null
  );
}

export async function resolveSaldoProdutoIds(produtoId: string) {
  const { data: produto, error: produtoError } = await supabase
    .from('produtos')
    .select('id, nome, grupo, grupo_id, ativo')
    .eq('id', produtoId)
    .maybeSingle();

  if (produtoError) throw produtoError;
  if (!produto?.id) return [produtoId];

  const legacyPrefix = getLegacySaldoPrefix(produto.nome);
  if (!legacyPrefix) return [produtoId];

  let candidatosQuery = supabase
    .from('produtos')
    .select('id, nome')
    .eq('ativo', true);

  if (produto.grupo_id) {
    candidatosQuery = candidatosQuery.eq('grupo_id', produto.grupo_id);
  } else if (produto.grupo) {
    candidatosQuery = candidatosQuery.eq('grupo', produto.grupo);
  }

  const { data: candidatos, error: candidatosError } = await candidatosQuery.order('nome');

  if (candidatosError) throw candidatosError;

  const ids = (candidatos || [])
    .filter((candidato) => {
      const nomeNormalizado = normalizeProdutoNome(candidato.nome);
      return nomeNormalizado === legacyPrefix || nomeNormalizado.startsWith(`${legacyPrefix} `);
    })
    .map((candidato) => candidato.id);

  return Array.from(new Set([produtoId, ...ids]));
}