/**
 * Tabelas de CST tradicionais (ICMS, PIS/COFINS, IPI) e CSOSN (Simples Nacional).
 * Para CSTs da Reforma Tributária (IBS, CBS, IS) veja src/lib/cstReformaTributaria.ts.
 */

// CST ICMS - Regime Normal (Tabela A)
export const CST_ICMS = [
  { value: "00", label: "00 - Tributada integralmente" },
  { value: "10", label: "10 - Tributada e com cobrança do ICMS por substituição tributária" },
  { value: "20", label: "20 - Com redução de base de cálculo" },
  { value: "30", label: "30 - Isenta ou não tributada e com cobrança do ICMS por ST" },
  { value: "40", label: "40 - Isenta" },
  { value: "41", label: "41 - Não tributada" },
  { value: "50", label: "50 - Suspensão" },
  { value: "51", label: "51 - Diferimento" },
  { value: "60", label: "60 - ICMS cobrado anteriormente por ST" },
  { value: "70", label: "70 - Com redução de base de cálculo e cobrança do ICMS por ST" },
  { value: "90", label: "90 - Outras" },
];

// CSOSN - Simples Nacional
export const CSOSN = [
  { value: "101", label: "101 - Tributada pelo Simples Nacional com permissão de crédito" },
  { value: "102", label: "102 - Tributada pelo Simples Nacional sem permissão de crédito" },
  { value: "103", label: "103 - Isenção do ICMS no Simples Nacional para faixa de receita bruta" },
  { value: "201", label: "201 - Tributada pelo SN com permissão de crédito e cobrança do ICMS por ST" },
  { value: "202", label: "202 - Tributada pelo SN sem permissão de crédito e cobrança do ICMS por ST" },
  { value: "203", label: "203 - Isenção do ICMS no SN para faixa de receita bruta e cobrança do ICMS por ST" },
  { value: "300", label: "300 - Imune" },
  { value: "400", label: "400 - Não tributada pelo Simples Nacional" },
  { value: "500", label: "500 - ICMS cobrado anteriormente por ST ou por antecipação" },
  { value: "900", label: "900 - Outros" },
];

// CST PIS/COFINS
export const CST_PIS_COFINS = [
  { value: "01", label: "01 - Operação tributável com alíquota básica" },
  { value: "02", label: "02 - Operação tributável com alíquota diferenciada" },
  { value: "03", label: "03 - Operação tributável com alíquota por unidade de medida" },
  { value: "04", label: "04 - Operação tributável monofásica - revenda a alíquota zero" },
  { value: "05", label: "05 - Operação tributável por substituição tributária" },
  { value: "06", label: "06 - Operação tributável a alíquota zero" },
  { value: "07", label: "07 - Operação isenta da contribuição" },
  { value: "08", label: "08 - Operação sem incidência da contribuição" },
  { value: "09", label: "09 - Operação com suspensão da contribuição" },
  { value: "49", label: "49 - Outras operações de saída" },
  { value: "50", label: "50 - Operação com direito a crédito - vinculada exclusivamente a receita tributada no mercado interno" },
  { value: "51", label: "51 - Operação com direito a crédito - vinculada exclusivamente a receita não tributada no mercado interno" },
  { value: "52", label: "52 - Operação com direito a crédito - vinculada exclusivamente a receita de exportação" },
  { value: "53", label: "53 - Operação com direito a crédito - vinculada a receitas tributadas e não-tributadas no mercado interno" },
  { value: "54", label: "54 - Operação com direito a crédito - vinculada a receitas tributadas no mercado interno e de exportação" },
  { value: "55", label: "55 - Operação com direito a crédito - vinculada a receitas não-tributadas no mercado interno e de exportação" },
  { value: "56", label: "56 - Operação com direito a crédito - vinculada a receitas tributadas e não-tributadas no mercado interno e de exportação" },
  { value: "60", label: "60 - Crédito presumido - operação de aquisição vinculada exclusivamente a receita tributada no mercado interno" },
  { value: "61", label: "61 - Crédito presumido - vinculada exclusivamente a receita não-tributada no mercado interno" },
  { value: "62", label: "62 - Crédito presumido - vinculada exclusivamente a receita de exportação" },
  { value: "63", label: "63 - Crédito presumido - vinculada a receitas tributadas e não-tributadas no mercado interno" },
  { value: "64", label: "64 - Crédito presumido - vinculada a receitas tributadas no mercado interno e de exportação" },
  { value: "65", label: "65 - Crédito presumido - vinculada a receitas não-tributadas no mercado interno e de exportação" },
  { value: "66", label: "66 - Crédito presumido - vinculada a receitas tributadas e não-tributadas no mercado interno e de exportação" },
  { value: "67", label: "67 - Crédito presumido - outras operações" },
  { value: "70", label: "70 - Operação de aquisição sem direito a crédito" },
  { value: "71", label: "71 - Operação de aquisição com isenção" },
  { value: "72", label: "72 - Operação de aquisição com suspensão" },
  { value: "73", label: "73 - Operação de aquisição a alíquota zero" },
  { value: "74", label: "74 - Operação de aquisição sem incidência da contribuição" },
  { value: "75", label: "75 - Operação de aquisição por substituição tributária" },
  { value: "98", label: "98 - Outras operações de entrada" },
  { value: "99", label: "99 - Outras operações" },
];

// CST IPI
export const CST_IPI = [
  { value: "00", label: "00 - Entrada com recuperação de crédito" },
  { value: "01", label: "01 - Entrada tributada com alíquota zero" },
  { value: "02", label: "02 - Entrada isenta" },
  { value: "03", label: "03 - Entrada não-tributada" },
  { value: "04", label: "04 - Entrada imune" },
  { value: "05", label: "05 - Entrada com suspensão" },
  { value: "49", label: "49 - Outras entradas" },
  { value: "50", label: "50 - Saída tributada" },
  { value: "51", label: "51 - Saída tributada com alíquota zero" },
  { value: "52", label: "52 - Saída isenta" },
  { value: "53", label: "53 - Saída não-tributada" },
  { value: "54", label: "54 - Saída imune" },
  { value: "55", label: "55 - Saída com suspensão" },
  { value: "99", label: "99 - Outras saídas" },
];

/** Retorna a lista correta de CST/CSOSN do ICMS conforme o CRT do emitente (1/2 = Simples). */
export function getCstIcmsOptions(crt: number | null | undefined) {
  return crt === 1 || crt === 2 ? CSOSN : CST_ICMS;
}
