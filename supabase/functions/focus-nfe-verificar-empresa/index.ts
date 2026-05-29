import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const getBaseUrl = (ambiente: number | null | undefined) => {
  return ambiente === 2
    ? "https://homologacao.focusnfe.com.br"
    : "https://api.focusnfe.com.br";
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");
const getAmbienteLabel = (ambiente: number | null | undefined) =>
  ambiente === 2 ? "homologação" : "produção";
const getDocumentoQuery = (cpfCnpj: string) =>
  cpfCnpj.length === 11
    ? { key: "cpf", label: "CPF" }
    : { key: "cnpj", label: "CNPJ" };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const _authClient = createClient(SUPABASE_URL!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: _userData, error: _userErr } = await _authClient.auth.getUser();
    if (_userErr || !_userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { emitente_id, cpf_cnpj, inscricao_produtor_id } = await req.json();

    if (!emitente_id) {
      return new Response(
        JSON.stringify({ success: false, error: "emitente_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Buscar token + ambiente do emitente
    const { data: emitenteRow, error: eErr } = await supabase
      .from("emitentes_nfe")
      .select("id, ambiente, emitentes_nfe_credentials(api_access_token_principal_producao, api_access_token, api_access_token_homologacao)")
      .eq("id", emitente_id)
      .maybeSingle();

    if (eErr || !emitenteRow) {
      return new Response(
        JSON.stringify({ success: false, error: "Emitente não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ambiente: number | null = (emitenteRow as Record<string, unknown>).ambiente as number | null;
    const credsRaw = (emitenteRow as Record<string, unknown>).emitentes_nfe_credentials;
    const credObj = Array.isArray(credsRaw)
      ? (credsRaw[0] as { api_access_token_principal_producao?: string | null; api_access_token?: string | null; api_access_token_homologacao?: string | null } | undefined)
      : (credsRaw as { api_access_token_principal_producao?: string | null; api_access_token?: string | null; api_access_token_homologacao?: string | null } | null);
    const tokenPrincipal = credObj?.api_access_token_principal_producao ?? null;
    const tokenFallback = credObj?.api_access_token ?? null;
    const token = tokenPrincipal || tokenFallback;
    const tokenTipo = tokenPrincipal ? "token_principal_producao" : tokenFallback ? "token_producao_emitente" : null;

    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token Principal de Produção da Focus NFe não configurado para este emitente",
          codigo: "token_ausente",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Determinar CPF/CNPJ a verificar
    let cpfCnpjAlvo: string | null = cpf_cnpj ? onlyDigits(cpf_cnpj) : null;

    if (!cpfCnpjAlvo && inscricao_produtor_id) {
      const { data: insc } = await supabase
        .from("inscricoes_produtor")
        .select("cpf_cnpj")
        .eq("id", inscricao_produtor_id)
        .maybeSingle();
      if (insc?.cpf_cnpj) cpfCnpjAlvo = onlyDigits(insc.cpf_cnpj);
    }

    if (!cpfCnpjAlvo) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Informe o CPF/CNPJ ou a inscrição do produtor a verificar",
          codigo: "cpf_cnpj_ausente",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ambienteLabel = getAmbienteLabel(ambiente);
    const baseUrl = getBaseUrl(ambiente);
    const documentoQuery = getDocumentoQuery(cpfCnpjAlvo);
    const url = `${baseUrl}/v2/empresas?${documentoQuery.key}=${cpfCnpjAlvo}`;
    console.log("Verificando empresa Focus NFe:", url);

    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Basic ${btoa(`${token}:`)}` },
    });

    const text = await resp.text();
    let body: unknown = null;
    try { body = JSON.parse(text); } catch { /* não-json */ }

    const tokenPrefix = `${token.slice(0, 6)}…(${token.length} chars)`;
    console.log("Focus NFe resposta:", resp.status, text.slice(0, 800));

    // Helpers: Focus pode retornar objeto {codigo, mensagem} ou um array ["codigo","X","mensagem","Y"]
    const extractField = (b: unknown, key: string): string | null => {
      if (!b) return null;
      if (Array.isArray(b)) {
        const i = b.indexOf(key);
        if (i >= 0 && typeof b[i + 1] === "string") return b[i + 1] as string;
        return null;
      }
      if (typeof b === "object") {
        const o = b as Record<string, unknown>;
        const v = o[key];
        return typeof v === "string" ? v : null;
      }
      return null;
    };
    const focusCodigo = extractField(body, "codigo") ?? extractField(body, "code");
    const focusMensagem = extractField(body, "mensagem") ?? extractField(body, "message");
    const bodyAsObj = Array.isArray(body) ? (body as unknown) : (body as Record<string, unknown> | null);

    // 401/403 → token inválido
    if (resp.status === 401 || resp.status === 403) {
      return new Response(
        JSON.stringify({
          success: true,
          habilitada: false,
          ambiente,
          ambiente_label: ambienteLabel,
          cpf_cnpj: cpfCnpjAlvo,
          codigo: "token_invalido_ou_sem_permissao",
          mensagem: `A Focus NFe recusou o Token Principal de Produção ${tokenPrefix} ao consultar o ${documentoQuery.label} ${cpfCnpjAlvo}. Confirme se o token principal pertence a essa conta e se a empresa existe nela.`,
          detalhes: { token_prefix: tokenPrefix, token_tipo: tokenTipo, url, status_http: resp.status, focus_resposta: bodyAsObj ?? text.slice(0, 500) },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (resp.status === 404 || focusCodigo === "nao_encontrado" || focusCodigo === "empresa_nao_encontrada") {
      return new Response(
        JSON.stringify({
          success: true,
          habilitada: false,
          ambiente,
          ambiente_label: ambienteLabel,
          cpf_cnpj: cpfCnpjAlvo,
          codigo: "empresa_nao_cadastrada",
          mensagem: `O ${documentoQuery.label} ${cpfCnpjAlvo} não está cadastrado na sua conta da Focus NFe (${ambienteLabel}) — token usado: ${tokenPrefix}. Cadastre a empresa no painel da Focus, anexe o certificado digital A1 e habilite-a para emissão.`,
          detalhes: { token_prefix: tokenPrefix, url, focus_resposta: bodyAsObj ?? text.slice(0, 500) },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 422 → requisição inválida / permissão negada
    if (resp.status === 422) {
      const isReqInvalida = focusCodigo === "requisicao_invalida";
      const isNaoHabilitada = (focusCodigo ?? "").includes("nao_habilitad") || focusCodigo === "permissao_negada";
      return new Response(
        JSON.stringify({
          success: true,
          habilitada: false,
          ambiente,
          ambiente_label: ambienteLabel,
          cpf_cnpj: cpfCnpjAlvo,
          codigo: focusCodigo ?? "requisicao_invalida",
          mensagem: focusMensagem
            ? `Focus NFe: ${focusMensagem}`
            : isNaoHabilitada
              ? `A Focus NFe negou a consulta dessa empresa no ambiente ${ambienteLabel}. Verifique se o token principal tem acesso à empresa cadastrada.`
              : isReqInvalida
                ? `A Focus NFe rejeitou a busca do ${documentoQuery.label} ${cpfCnpjAlvo}. Verifique se o documento está correto e se a empresa foi cadastrada na conta certa da Focus.`
                : `A Focus NFe retornou HTTP 422 ao buscar ${documentoQuery.label} ${cpfCnpjAlvo}.`,
          detalhes: { token_prefix: tokenPrefix, token_tipo: tokenTipo, url, status_http: 422, focus_codigo: focusCodigo, focus_resposta: bodyAsObj ?? text.slice(0, 500) },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!resp.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Focus NFe retornou HTTP ${resp.status}${focusMensagem ? `: ${focusMensagem}` : ""}`,
          detalhes: bodyAsObj ?? text.slice(0, 500),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const empresas = Array.isArray(body)
      ? body.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      : [];

    const bodyObj = empresas.find((empresa) => {
      const cpf = typeof empresa.cpf === "string" ? onlyDigits(empresa.cpf) : "";
      const cnpj = typeof empresa.cnpj === "string" ? onlyDigits(empresa.cnpj) : "";
      return cpf === cpfCnpjAlvo || cnpj === cpfCnpjAlvo;
    }) ?? empresas[0] ?? null;

    if (!bodyObj) {
      return new Response(
        JSON.stringify({
          success: true,
          habilitada: false,
          ambiente,
          ambiente_label: ambienteLabel,
          cpf_cnpj: cpfCnpjAlvo,
          codigo: "empresa_nao_cadastrada",
          mensagem: `O ${documentoQuery.label} ${cpfCnpjAlvo} não foi localizado na listagem de empresas da sua conta Focus NFe (${ambienteLabel}).`,
          detalhes: {
            token_prefix: tokenPrefix,
            token_tipo: tokenTipo,
            url,
            total_encontrado: empresas.length,
            focus_resposta: Array.isArray(body) ? body.slice(0, 3) : bodyAsObj ?? text.slice(0, 500),
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 200 → empresa existe; checar se está habilitada para o ambiente
    const habProd = Boolean(bodyObj.habilita_nfe);
    const habHom = Boolean(bodyObj.habilita_nfe_homologacao);
    const habAtual = ambiente === 2 ? habHom : habProd;

    return new Response(
      JSON.stringify({
        success: true,
        habilitada: habAtual,
        habilitada_producao: habProd,
        habilitada_homologacao: habHom,
        ambiente,
        ambiente_label: ambienteLabel,
        cpf_cnpj: cpfCnpjAlvo,
        nome: (bodyObj.nome as string) ?? null,
        codigo: habAtual ? "habilitada" : "nao_habilitada_no_ambiente",
        mensagem: habAtual
          ? `Empresa cadastrada e habilitada para emissão em ${ambienteLabel}.`
          : `Empresa cadastrada na Focus NFe, mas NÃO está habilitada para emissão em ${ambienteLabel}. Habilite no painel da Focus.`,
        detalhes: { ...bodyObj, token_prefix: tokenPrefix, token_tipo: tokenTipo, url },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Erro ao verificar empresa Focus NFe:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
