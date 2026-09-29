/**
 * Resolve a Inscrição do Produtor correta a partir dos dados do DESTINATÁRIO
 * presentes no XML da NF-e.
 *
 * Motivo: as consultas de DFe na SEFAZ são feitas pelo CPF/CNPJ do titular,
 * portanto a nota pode ter sido emitida contra QUALQUER uma das inscrições
 * (granjas) daquele titular. Antes, a entrada era gravada sempre na inscrição
 * pré-selecionada na tela, o que gerava vínculo na IE errada (e, por
 * consequência, emitente errado nas devoluções/contra-notas).
 */

export interface InscricaoCandidata {
  id: string;
  cpf_cnpj?: string | null;
  inscricao_estadual?: string | null;
  ativa?: boolean | null;
}

export interface DestinatarioXml {
  cpf?: string | null;
  cnpj?: string | null;
  inscricaoEstadual?: string | null;
}

const digits = (v?: string | null) => (v || "").replace(/\D/g, "");

export interface ResolucaoInscricao {
  /** Inscrição que deve ser usada na entrada. */
  inscricaoId: string;
  /** true quando a IE do XML foi localizada no cadastro. */
  encontradaPorIe: boolean;
  /** IE do XML (somente dígitos), para mensagens ao usuário. */
  ieXml: string;
  /** true quando difere da inscrição pré-selecionada na tela. */
  trocou: boolean;
}

/**
 * Procura, entre as inscrições do mesmo titular (mesmo CPF/CNPJ), aquela cuja
 * Inscrição Estadual coincide com a IE do destinatário do XML.
 * Se não encontrar, mantém a inscrição informada (fallback).
 */
export function resolverInscricaoDestinatario(
  inscricoes: InscricaoCandidata[] | undefined | null,
  destinatario: DestinatarioXml | undefined | null,
  inscricaoFallbackId: string
): ResolucaoInscricao {
  const ieXml = digits(destinatario?.inscricaoEstadual);
  const docXml = digits(destinatario?.cnpj || destinatario?.cpf);
  const lista = inscricoes || [];

  if (!ieXml) {
    return { inscricaoId: inscricaoFallbackId, encontradaPorIe: false, ieXml, trocou: false };
  }

  const mesmoTitular = docXml
    ? lista.filter((i) => digits(i.cpf_cnpj) === docXml)
    : lista;

  const candidatas = (mesmoTitular.length > 0 ? mesmoTitular : lista).filter(
    (i) => digits(i.inscricao_estadual) === ieXml
  );

  // Prefere inscrição ativa quando houver mais de uma com a mesma IE.
  const escolhida = candidatas.find((i) => i.ativa !== false) || candidatas[0];

  if (!escolhida) {
    return { inscricaoId: inscricaoFallbackId, encontradaPorIe: false, ieXml, trocou: false };
  }

  return {
    inscricaoId: escolhida.id,
    encontradaPorIe: true,
    ieXml,
    trocou: escolhida.id !== inscricaoFallbackId,
  };
}
