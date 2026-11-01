/** Detecta falhas de rede do navegador (ex.: "TypeError: Failed to fetch"). */
export function isErroConexao(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg = String((error as { message?: string })?.message ?? error ?? "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("fetch failed")
  );
}

/** Mensagem amigável para o operador, traduzindo erros de conexão. */
export function mensagemErro(prefixo: string, error: unknown): string {
  if (isErroConexao(error)) {
    return "Falha na conexão com a internet. Verifique sua rede e tente novamente (ou pressione F5 para reconectar).";
  }
  return `${prefixo}: ${(error as { message?: string })?.message ?? String(error)}`;
}
