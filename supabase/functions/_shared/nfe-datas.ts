/**
 * Normalização das datas retornadas pela API da Focus NFe.
 *
 * A API pode devolver a data/hora do documento em campos com nomes diferentes
 * (`data_emissao`, `dhEmi`, `data_autorizacao`, `dhRecbto`, ...) e em formatos
 * distintos (ISO com fuso, ISO sem fuso, apenas data). Aqui convertemos para um
 * timestamp ISO com fuso, retornando `null` quando o valor não é utilizável —
 * assim nunca sobrescrevemos o banco com um valor inválido.
 */

const CHAVES_EMISSAO = [
  "data_emissao",
  "dhEmi",
  "dh_emi",
  "data_emissao_nfe",
];

const CHAVES_AUTORIZACAO = [
  "data_autorizacao",
  "dhRecbto",
  "dh_recbto",
  "data_recebimento",
  "data_processamento",
];

/** Converte um valor arbitrário em timestamp ISO válido (ou null). */
export function normalizarDataApi(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const bruto = valor.trim();
  if (!bruto) return null;

  // Apenas data (sem horário) não serve como instante de emissão.
  if (/^\d{4}-\d{2}-\d{2}$/.test(bruto)) return null;

  // ISO sem fuso: a Focus opera no horário de Brasília.
  const semFuso = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(bruto);
  const candidato = semFuso ? `${bruto.replace(" ", "T")}-03:00` : bruto.replace(" ", "T");

  const data = new Date(candidato);
  if (Number.isNaN(data.getTime())) return null;

  // Sanidade: recusa datas absurdas (ex.: 1970 ou muito no futuro).
  const ano = data.getUTCFullYear();
  if (ano < 2000 || ano > 2100) return null;

  return data.toISOString();
}

function primeiraDataValida(
  fonte: Record<string, unknown>,
  chaves: string[],
): string | null {
  for (const chave of chaves) {
    const normalizada = normalizarDataApi(fonte[chave]);
    if (normalizada) return normalizada;
  }
  return null;
}

/**
 * Extrai da resposta da API os campos de data que devem ser gravados na nota.
 * Retorna um objeto pronto para fazer spread no `updateData` — vazio quando a
 * API não trouxe nenhuma data aproveitável.
 */
export function extrairDatasNfe(
  responseData: Record<string, unknown> | null | undefined,
): { data_emissao?: string; data_autorizacao?: string } {
  if (!responseData || typeof responseData !== "object") return {};

  const resultado: { data_emissao?: string; data_autorizacao?: string } = {};

  const emissao = primeiraDataValida(responseData, CHAVES_EMISSAO);
  if (emissao) resultado.data_emissao = emissao;

  const autorizacao = primeiraDataValida(responseData, CHAVES_AUTORIZACAO);
  if (autorizacao) resultado.data_autorizacao = autorizacao;

  return resultado;
}
