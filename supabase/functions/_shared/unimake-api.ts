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
    // Inclui o motivo real devolvido pela Unimake (ex.: "Aplicação não encontrada.")
    const motivo = unimakeErroTexto(await resp.text().catch(() => ""), resp.status);
    throw new Error(
      `A Unimake recusou as credenciais (${motivo}). Confira o App ID e o Secret no cadastro do emitente (ambiente ${unimakeAmbienteLabel(cred.ambiente)}).`,
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

/** Mensagem legível a partir do texto (JSON RFC 7807 ou XML) de uma resposta de erro. */
export function unimakeErroTexto(texto: string, status: number): string {
  try {
    const t = JSON.parse(texto) as { errors?: unknown; title?: string; detail?: string; message?: string };
    if (Array.isArray(t?.errors) && t.errors.length > 0) return t.errors.map(String).join(" | ");
    if (t?.errors && typeof t.errors === "object") return Object.values(t.errors as Record<string, unknown>).flat().map(String).join(" | ");
    if (t?.detail || t?.title || t?.message) return String(t.detail || t.title || t.message);
  } catch { /* texto/XML */ }
  const xm = texto.match(/<(?:\w+:)?xMotivo>([^<]*)</i)?.[1];
  return xm || texto.slice(0, 300) || `HTTP ${status}`;
}

/** Envia XML SEFAZ para a Unimake e devolve o texto da resposta. */
export async function unimakeXmlPost(
  cred: UnimakeCredentials,
  path: string,
  xml: string,
): Promise<{ ok: boolean; status: number; texto: string }> {
  const token = await obterTokenUnimake(cred);
  const resp = await fetch(`${unimakeBaseUrl(cred.ambiente)}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/xml", Accept: "application/xml" },
    body: xml,
  });
  const texto = await resp.text();
  return { ok: resp.ok, status: resp.status, texto };
}

export const tpAmbUnimake = (ambiente: number | null | undefined) => (ambiente === 2 ? 2 : 1);

export const corsUnimake = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const jsonResp = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsUnimake, "Content-Type": "application/json" } });

/**
 * Autentica o chamador (JWT) e, opcionalmente, exige papel operacional.
 * Retorna o id do usuário ou uma Response de erro.
 */
export async function autenticarUnimake(
  req: Request,
  admin: Admin,
  // deno-lint-ignore no-explicit-any
  createClient: (...a: any[]) => any,
  exigirPapel = true,
): Promise<{ userId: string; email?: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonResp({ error: "Não autorizado" }, 401);
  const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await authClient.auth.getUser();
  if (error || !data?.user) return jsonResp({ error: "Não autenticado" }, 401);
  if (exigirPapel) {
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", data.user.id);
    if (!(roles || []).some((r: { role: string }) => ["admin", "gerente", "operador"].includes(r.role))) {
      return jsonResp({ error: "Permissão insuficiente" }, 403);
    }
  }
  return { userId: data.user.id, email: data.user.email };
}

export interface ContextoNotaUnimake {
  emitenteId: string;
  cred: UnimakeCredentials;
  docEmitente: string;
  chave: string | null;
  protocolo: string | null;
  // deno-lint-ignore no-explicit-any
  nota: any;
}

/** Carrega nota, emitente, CPF/CNPJ e credenciais Unimake. Lança Error amigável. */
export async function carregarContextoNota(admin: Admin, notaFiscalId: string): Promise<ContextoNotaUnimake> {
  const { data: nota } = await admin
    .from("notas_fiscais")
    .select(`id, emitente_id, chave_acesso, protocolo, uuid_api, status, numero, serie, info_complementar,
      emitentes_nfe!notas_fiscais_emitente_id_fkey(id, ambiente, numero_atual_nfe, serie_nfe,
        inscricao:inscricoes_produtor!emitentes_nfe_inscricao_produtor_id_fkey(cpf_cnpj, uf))`)
    .eq("id", notaFiscalId)
    .maybeSingle();
  if (!nota) throw new Error("Nota fiscal não encontrada no banco de dados");
  if (!nota.emitente_id) throw new Error("Nota fiscal sem emitente vinculado");
  const cred = await buscarCredenciaisUnimake(admin, nota.emitente_id);
  if (!cred) throw new Error("App ID / Secret da Unimake não configurados para este emitente.");
  const docEmitente = String(nota.emitentes_nfe?.inscricao?.cpf_cnpj ?? "").replace(/\D/g, "");
  if (![11, 14].includes(docEmitente.length)) throw new Error("CPF/CNPJ do emitente não encontrado na inscrição do produtor.");
  const chaveRaw = String(nota.chave_acesso || nota.uuid_api || "").replace(/\D/g, "");
  return {
    emitenteId: nota.emitente_id,
    cred,
    docEmitente,
    chave: chaveRaw.length === 44 ? chaveRaw : null,
    protocolo: nota.protocolo ?? null,
    nota,
  };
}
