/**
 * Sugere o CFOP de entrada correto para um item de NF-e recebida.
 *
 * Regras:
 *  - Insumos / matéria-prima  → 1.101 (interna) / 2.101 (interestadual)
 *  - Ativo imobilizado
 *    (máquinas/implementos ou bens/benfeitorias) → 1.551 / 2.551
 *  - Uso e consumo (default)                    → 1.556 / 2.556
 *
 * Interna quando UF do emitente = UF do destinatário. Se qualquer UF
 * estiver vazia, assume interna (comportamento seguro para lançamento
 * manual em que a UF pode ainda não ter sido preenchida).
 */

export interface GrupoFlags {
  insumos?: boolean | null;
  maquinas_implementos?: boolean | null;
  bens_benfeitorias?: boolean | null;
}

export type CfopEntradaSugerido =
  | "1101" | "2101"
  | "1551" | "2551"
  | "1556" | "2556";

export interface SuggestCfopInput {
  grupo?: GrupoFlags | null;
  ufEmitente?: string | null;
  ufDestinatario?: string | null;
}

export function suggestCfopEntrada({
  grupo,
  ufEmitente,
  ufDestinatario,
}: SuggestCfopInput): CfopEntradaSugerido {
  const ufE = (ufEmitente || "").trim().toUpperCase();
  const ufD = (ufDestinatario || "").trim().toUpperCase();
  const interestadual = !!ufE && !!ufD && ufE !== ufD;

  if (grupo?.insumos) {
    return interestadual ? "2101" : "1101";
  }
  if (grupo?.maquinas_implementos || grupo?.bens_benfeitorias) {
    return interestadual ? "2551" : "1551";
  }
  return interestadual ? "2556" : "1556";
}
