// Helpers compartilhados para as Edge Functions da Unimake (UniNFe Cloud).
// Autenticação: App ID + Secret da aplicação (POST /api/auth → Bearer token, válido 15 min).
// Endpoints: produção https://unimake.app/uninfe | sandbox https://dfe.sandbox.unimake.software
// Credenciais ficam em emitentes_nfe_credentials.api_consumer_key (App ID) /
// api_consumer_secret (Secret), roteadas por emitentes_nfe.api_provider = 'unimake'.

// deno-lint-ignore no-explicit-any
type Admin = any;

export const unimakeAuthUrl = (ambiente: number | null | undefined) =>
  ambiente === 2 ? "https://auth.sandbox.unimake.software/api/auth" : "https://unimake.app/auth/api/auth";

export const unimakeBaseUrl = (ambiente: number | null | undefined) =>
  ambiente === 2 ? "https://dfe.sandbox.unimake.software" : "https://unimake.app/uninfe";

export const unimakeAmbienteLabel = (ambiente: number | null | undefined) =>
  ambiente === 2 ? "homologação" : "produção";

export interface UnimakeCredentials {
  appId: string;
  secret: string;
  ambiente: number | null;
}

/**
 * Busca as credenciais da Unimake do emitente (tabela emitentes_nfe_credentials).
 * Retorna null quando o emitente não existe ou não tem credenciais configuradas.
 */
export async function buscarCredenciaisUnimake(
  admin: Admin,
  emitenteId: string,
): Promise<UnimakeCredentials | null> {
  const { data } = await admin
    .from("emitentes_nfe")
    .select("ambiente, emitentes_nfe_credentials(api_consumer_key, api_consumer_secret)")
    .eq("id", emitenteId)
    .maybeSingle();
  if (!data) return null;
  const credRaw = (data as { emitentes_nfe_credentials?: unknown }).emitentes_nfe_credentials;
  const cred = Array.isArray(credRaw) ? credRaw[0] : credRaw;
  const appId = (cred as { api_consumer_key?: string | null } | null)?.api_consumer_key;
  const secret = (cred as { api_consumer_secret?: string | null } | null)?.api_consumer_secret;
  if (!appId || !secret) return null;
  return {
    appId,
    secret,
    ambiente: (data as { ambiente?: number | null }).ambiente ?? null,
  };
}

/**
 * Obtém o Bearer token da Unimake (App ID + Secret).
 * Lança Error com mensagem amigável quando as credenciais são recusadas.
 */
export async function obterTokenUnimake(cred: UnimakeCredentials): Promise<string> {
  const resp = await fetch(unimakeAuthUrl(cred.ambiente), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appId: cred.appId, secret: cred.secret }),
  });
  if (!resp.ok) {
    throw new Error(
      `A Unimake recusou as credenciais (HTTP ${resp.status}). Confira o App ID e o Secret no cadastro do emitente.`,
    );
  }
  const data = await resp.json();
  if (!data?.token) {
    throw new Error("A Unimake não retornou o token de acesso. Tente novamente.");
  }
  return data.token as string;
}

/**
 * Executa uma chamada autenticada na API Unimake (UniNFe Cloud).
 */
export async function unimakeFetch(
  cred: UnimakeCredentials,
  path: string,
  options: { method?: string; body?: unknown; accept?: string; token?: string } = {},
): Promise<Response> {
  const token = options.token ?? await obterTokenUnimake(cred);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: options.accept ?? "application/json",
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  return fetch(`${unimakeBaseUrl(cred.ambiente)}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

/** Extrai mensagem legível do corpo de erro da Unimake (formato RFC 7807: { errors, title }). */
export async function unimakeErrorMessage(resp: Response): Promise<string> {
  const t = await resp.json().catch(() => null) as { errors?: string[]; title?: string; message?: string } | null;
  if (Array.isArray(t?.errors) && t.errors.length > 0) return t.errors.join(" | ");
  return t?.title || t?.message || `HTTP ${resp.status}`;
}
