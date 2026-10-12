// Helpers compartilhados para as Edge Functions da ACBr API Nuvem.
// Autenticação: OAuth2 client_credentials (Client ID / Client Secret do emitente).
// Endpoints: https://prod.acbr.api.br | https://hom.acbr.api.br

// deno-lint-ignore no-explicit-any
type Admin = any;

const AUTH_URL = "https://auth.acbr.api.br/realms/ACBrAPI/protocol/openid-connect/token";

export const acbrBaseUrl = (ambiente: number | null | undefined) =>
  ambiente === 2 ? "https://hom.acbr.api.br" : "https://prod.acbr.api.br";

export const acbrAmbienteLabel = (ambiente: number | null | undefined) =>
  ambiente === 2 ? "homologação" : "produção";

export interface AcbrCredentials {
  clientId: string;
  clientSecret: string;
  ambiente: number | null;
}

/**
 * Busca as credenciais OAuth da ACBr API do emitente (tabela emitentes_nfe_credentials).
 * Retorna null quando o emitente não existe ou não tem credenciais configuradas.
 */
export async function buscarCredenciaisAcbr(
  admin: Admin,
  emitenteId: string,
): Promise<AcbrCredentials | null> {
  const { data } = await admin
    .from("emitentes_nfe")
    .select("ambiente, emitentes_nfe_credentials(api_consumer_key, api_consumer_secret)")
    .eq("id", emitenteId)
    .maybeSingle();
  if (!data) return null;
  const credRaw = (data as { emitentes_nfe_credentials?: unknown }).emitentes_nfe_credentials;
  const cred = Array.isArray(credRaw) ? credRaw[0] : credRaw;
  const clientId = (cred as { api_consumer_key?: string | null } | null)?.api_consumer_key;
  const clientSecret = (cred as { api_consumer_secret?: string | null } | null)?.api_consumer_secret;
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    ambiente: (data as { ambiente?: number | null }).ambiente ?? null,
  };
}

/**
 * Obtém access_token OAuth2 da ACBr API (client_credentials).
 * Lança Error com mensagem amigável quando as credenciais são recusadas.
 */
export async function obterTokenAcbr(cred: AcbrCredentials): Promise<string> {
  const resp = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: cred.clientId,
      client_secret: cred.clientSecret,
      scope: "nfe",
    }),
  });
  if (!resp.ok) {
    throw new Error(
      `A ACBr API recusou as credenciais (HTTP ${resp.status}). Confira o Client ID e o Client Secret no cadastro do emitente.`,
    );
  }
  const data = await resp.json();
  if (!data?.access_token) {
    throw new Error("A ACBr API não retornou o token de acesso. Tente novamente.");
  }
  return data.access_token as string;
}

/**
 * Executa uma chamada autenticada na ACBr API Nuvem.
 */
export async function acbrFetch(
  cred: AcbrCredentials,
  path: string,
  options: { method?: string; body?: unknown; accept?: string } = {},
): Promise<Response> {
  const token = await obterTokenAcbr(cred);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: options.accept ?? "application/json",
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  return fetch(`${acbrBaseUrl(cred.ambiente)}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}
