import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve o nome de um município a partir de um valor que pode ser:
 *  - o código IBGE (7 dígitos)
 *  - o próprio nome já cadastrado
 * Se receber código IBGE, consulta a tabela `ibge_municipios` e retorna o nome.
 * Caso não encontre, retorna o valor original (fallback seguro).
 */
export async function resolveNomeMunicipio(
  valor: string | null | undefined,
  uf?: string | null,
): Promise<string> {
  if (!valor) return "";
  const trimmed = String(valor).trim();
  // Se não parece código IBGE, assume que já é nome
  if (!/^\d{6,7}$/.test(trimmed)) return trimmed;

  try {
    let q = supabase
      .from("ibge_municipios")
      .select("nome, uf, codigo_ibge")
      .eq("codigo_ibge", trimmed)
      .limit(1);
    if (uf) q = q.eq("uf", uf.toUpperCase());
    const { data } = await q;
    const nome = data?.[0]?.nome;
    return nome || trimmed;
  } catch {
    return trimmed;
  }
}
