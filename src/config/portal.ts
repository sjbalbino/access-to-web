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
  whatsapp: "5555991411755",
  telefoneExibicao: "(55) 99141-1755",
  email: "contato@dygitusinformatica.com.br",
  cidade: "Cruz Alta",
  uf: "RS",
};


export const PORTAL_URL = "https://sisagro.app";

export const PORTAL_NOME = "SisAgro";
export const PORTAL_DESCRICAO_CURTA =
  "Sistema de gestão agropecuária para cerealistas, armazéns e produtores rurais.";

export function whatsappLink(mensagem: string): string | null {
  const numero = PORTAL_CONTATO.whatsapp.replace(/\D/g, "");
  if (!numero) return null;
  return `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(mensagem)}`;
}

/**
 * Abre o WhatsApp em uma aba nova real.
 *
 * O WhatsApp envia cabeçalhos que impedem a navegação dentro de iframes
 * (ERR_BLOCKED_BY_RESPONSE na pré-visualização). Por isso forçamos
 * window.open e, se o navegador bloquear o popup, navegamos a janela de topo.
 */
export function abrirWhatsapp(
  url: string,
  evento?: { preventDefault: () => void },
): void {
  evento?.preventDefault();

  try {
    const janela = window.open(url, "_blank", "noopener,noreferrer");
    if (janela) return;
  } catch {
    // ignora e usa o fallback abaixo
  }

  try {
    // Escapa do iframe da pré-visualização quando possível
    (window.top ?? window).location.href = url;
  } catch {
    window.location.href = url;
  }
}

