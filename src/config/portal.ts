/**
 * Configuração do portal público (site institucional).
 *
 * Preencha os contatos abaixo com os dados reais da empresa.
 * Campos vazios simplesmente não são exibidos no site — nada é inventado.
 */
export interface PortalContato {
  /** Telefone no formato internacional, apenas dígitos. Ex.: 5551999999999 */
  whatsapp: string;
  telefoneExibicao: string;
  email: string;
  cidade: string;
  uf: string;
}

export const PORTAL_CONTATO: PortalContato = {
  whatsapp: "",
  telefoneExibicao: "",
  email: "",
  cidade: "",
  uf: "",
};

export const PORTAL_URL = "https://sisagro.app";

export const PORTAL_NOME = "SisAgro";
export const PORTAL_DESCRICAO_CURTA =
  "Sistema de gestão agropecuária para cerealistas, armazéns e produtores rurais.";

export function whatsappLink(mensagem: string): string | null {
  if (!PORTAL_CONTATO.whatsapp) return null;
  return `https://wa.me/${PORTAL_CONTATO.whatsapp}?text=${encodeURIComponent(mensagem)}`;
}
