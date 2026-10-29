/**
 * Utilitários de envio por WhatsApp.
 * O WhatsApp não permite anexar arquivos via link; por isso:
 *  - no celular usamos o compartilhamento nativo (arquivos + texto);
 *  - no computador baixamos os arquivos e abrimos o WhatsApp Web com a mensagem,
 *    para o usuário apenas arrastar os anexos.
 */

/** Normaliza telefone BR para dígitos com DDI 55. Retorna null se inválido. */
export function normalizarTelefoneWhatsapp(tel: string | null | undefined): string | null {
  if (!tel) return null;
  let d = tel.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  if (d.length < 12 || d.length > 13) return null;
  return d;
}

export function linkWhatsapp(telefone: string | null, mensagem: string): string {
  const base = telefone ? `https://wa.me/${telefone}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(mensagem)}`;
}

export function abrirLinkNovaAba(url: string): void {
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) window.location.href = url;
}

export function baixarBlob(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/** Tenta compartilhar arquivos pelo menu nativo (celular). Retorna false se não suportado. */
export async function compartilharArquivosNativo(files: File[], texto: string): Promise<boolean> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!nav.share || !nav.canShare || !nav.canShare({ files })) return false;
  try {
    await nav.share({ files, text: texto });
    return true;
  } catch (e) {
    // Usuário cancelou: consideramos tratado.
    if (e instanceof DOMException && e.name === "AbortError") return true;
    return false;
  }
}

export const formatarMoedaBR = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatarChave = (c: string | null | undefined) =>
  (c ?? "").replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ");
