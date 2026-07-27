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

  // Código IBGE → nome oficial
  if (/^\d{6,7}$/.test(trimmed)) {
    try {
      let q = supabase
        .from("ibge_municipios")
        .select("nome, uf, codigo_ibge")
        .eq("codigo_ibge", trimmed)
        .limit(1);
      if (uf) q = q.eq("uf", uf.toUpperCase());
      const { data } = await q;
      return data?.[0]?.nome || trimmed;
    } catch {
      return trimmed;
    }
  }

  // Nome informado manualmente → normaliza para a grafia oficial do IBGE
  // (ex.: "Santana do Livramento" → "Sant'Ana do Livramento"), exigida pela SEFAZ.
  if (!uf) return trimmed;
  try {
    const oficiais = await carregarMunicipiosUf(uf.toUpperCase());
    const chave = normalizarNome(trimmed);
    return oficiais.get(chave) || trimmed;
  } catch {
    return trimmed;
  }
}

function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const cacheUf = new Map<string, Map<string, string>>();

async function carregarMunicipiosUf(uf: string): Promise<Map<string, string>> {
  const cached = cacheUf.get(uf);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("ibge_municipios")
    .select("nome")
    .eq("uf", uf)
    .limit(2000);
  if (error) throw error;

  const mapa = new Map<string, string>();
  (data || []).forEach((m: { nome: string }) => {
    mapa.set(normalizarNome(m.nome), m.nome);
  });
  cacheUf.set(uf, mapa);
  return mapa;
}
