/**
 * Retorna o rótulo padrão para exibir uma inscrição estadual em selects.
 * Prioriza nome_fantasia como identificador amigável.
 */
export function labelInscricao(insc: {
  nome_fantasia?: string | null;
  nome?: string | null;
  inscricao_estadual?: string | null;
  cpf_cnpj?: string | null;
  produtores?: { nome?: string | null } | null;
  produtor_nome?: string | null;
} | null | undefined): string {
  if (!insc) return "";
  const fantasia = insc.nome_fantasia?.trim();
  // Nome próprio da inscrição prevalece (IE compartilhada entre membros da família).
  const produtor = insc.nome?.trim() || insc.produtor_nome || insc.produtores?.nome || "";
  const ie = insc.inscricao_estadual || insc.cpf_cnpj || "-";
  if (fantasia) {
    return produtor ? `${fantasia} - ${produtor} (IE: ${ie})` : `${fantasia} (IE: ${ie})`;
  }
  return produtor ? `${produtor} - IE: ${ie}` : `IE: ${ie}`;
}
