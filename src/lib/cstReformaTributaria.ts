/**
 * CSTs da Reforma Tributária conforme NT 2025.002 v1.34
 * Válido a partir de janeiro/2026
 */

// CST IBS/CBS (Imposto sobre Bens e Serviços / Contribuição sobre Bens e Serviços)
export const CST_IBS_CBS = [
  { value: '000', label: '000 - Tributação integral' },
  { value: '010', label: '010 - Tributação com alíquotas uniformes - Setor financeiro' },
  { value: '011', label: '011 - Tributação com alíquotas uniformes reduzidas em 60%' },
  { value: '012', label: '012 - Tributação com alíquotas uniformes reduzidas em 30%' },
  { value: '200', label: '200 - Alíquota zero' },
  { value: '210', label: '210 - Redução de alíquota' },
  { value: '220', label: '220 - Alíquota fixa por quantidade' },
  { value: '221', label: '221 - Alíquota fixa proporcional' },
  { value: '222', label: '222 - Alíquota fixa específica' },
  { value: '300', label: '300 - Crédito presumido' },
  { value: '400', label: '400 - Isenção' },
  { value: '410', label: '410 - Imunidade' },
  { value: '420', label: '420 - Não incidência' },
  { value: '500', label: '500 - Diferimento total' },
  { value: '510', label: '510 - Diferimento total' },
  { value: '515', label: '515 - Diferimento parcial' },
  { value: '550', label: '550 - Suspensão' },
  { value: '600', label: '600 - Tributação monofásica - Operação tributável' },
  { value: '610', label: '610 - Tributação monofásica - Revenda sem direito a crédito' },
  { value: '620', label: '620 - Tributação monofásica - Operação não tributável' },
  { value: '700', label: '700 - Regime específico de tributação' },
  { value: '800', label: '800 - Split payment - Pagamento antecipado' },
  { value: '810', label: '810 - Ajustes de IBS/CBS na ZFM e ALC' },
  { value: '900', label: '900 - Outros' },
];

// CST IS (Imposto Seletivo) - Baseado na estrutura da NT 2025.002
export const CST_IS = [
  { value: '000', label: '000 - Tributação integral' },
  { value: '200', label: '200 - Alíquota zero' },
  { value: '210', label: '210 - Redução de alíquota' },
  { value: '400', label: '400 - Isenção' },
  { value: '410', label: '410 - Imunidade' },
  { value: '420', label: '420 - Não incidência' },
  { value: '550', label: '550 - Suspensão' },
  { value: '600', label: '600 - Tributação monofásica - Operação tributável' },
  { value: '620', label: '620 - Tributação monofásica - Operação não tributável' },
  { value: '900', label: '900 - Outros' },
];

/**
 * Verifica se o CST IBS/CBS indica tributação
 */
export function cstIbsCbsTemTributacao(cst: string | null | undefined): boolean {
  if (!cst) return false;
  const cstsTributados = ['000', '010', '011', '012', '210', '220', '221', '222', '300', '510', '600', '700', '800'];
  return cstsTributados.includes(cst);
}

/**
 * Verifica se o CST IS indica tributação
 */
export function cstIsTemTributacao(cst: string | null | undefined): boolean {
  if (!cst) return false;
  const cstsTributados = ['000', '210', '600'];
  return cstsTributados.includes(cst);
}

/**
 * Formata CST para 3 dígitos
 */
export function formatCstReformaTributaria(cst: string | null | undefined): string {
  if (!cst) return '000';
  return cst.padStart(3, '0');
}
