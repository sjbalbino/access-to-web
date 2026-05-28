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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      .select("id, ambiente, emitentes_nfe_credentials(api_access_token)")
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
    const token: string | null = Array.isArray(credsRaw)
      ? (credsRaw[0] as { api_access_token?: string | null } | undefined)?.api_access_token ?? null
      : (credsRaw as { api_access_token?: string | null } | null)?.api_access_token ?? null;

    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token da Focus NFe não configurado para este emitente",
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

    const baseUrl = getBaseUrl(ambiente);
    const url = `${baseUrl}/v2/empresas/${cpfCnpjAlvo}`;
    console.log("Verificando empresa Focus NFe:", url);

    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Basic ${btoa(`${token}:`)}` },
    });

    const text = await resp.text();
    let body: Record<string, unknown> | null = null;
    try { body = JSON.parse(text); } catch { /* não-json */ }

    const ambienteLabel = ambiente === 2 ? "homologação" : "produção";

    // 404 → empresa não cadastrada na Focus
    if (resp.status === 404) {
      return new Response(
        JSON.stringify({
          success: true,
          habilitada: false,
          ambiente,
          ambiente_label: ambienteLabel,
          cpf_cnpj: cpfCnpjAlvo,
          codigo: "empresa_nao_cadastrada",
          mensagem: `O CPF/CNPJ ${cpfCnpjAlvo} não está cadastrado na sua conta da Focus NFe (${ambienteLabel}). Cadastre a empresa no painel da Focus, anexe o certificado digital A1 e habilite-a para emissão.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 401/403 → token inválido / sem permissão
    if (resp.status === 401 || resp.status === 403) {
      return new Response(
        JSON.stringify({
          success: true,
          habilitada: false,
          ambiente,
          ambiente_label: ambienteLabel,
          cpf_cnpj: cpfCnpjAlvo,
          codigo: "token_invalido_ou_sem_permissao",
          mensagem: `O token cadastrado neste emitente não tem permissão para consultar o CPF/CNPJ ${cpfCnpjAlvo} em ${ambienteLabel}. Verifique se o token pertence à conta correta da Focus NFe.`,
          detalhes: body,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!resp.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Focus NFe retornou HTTP ${resp.status}`,
          detalhes: body ?? text.slice(0, 500),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 200 → empresa existe; checar se está habilitada para o ambiente
    const habProd = Boolean(body?.habilita_nfe);
    const habHom = Boolean(body?.habilita_nfe_homologacao);
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
        nome: body?.nome ?? null,
        codigo: habAtual ? "habilitada" : "nao_habilitada_no_ambiente",
        mensagem: habAtual
          ? `Empresa cadastrada e habilitada para emissão em ${ambienteLabel}.`
          : `Empresa cadastrada na Focus NFe, mas NÃO está habilitada para emissão em ${ambienteLabel}. Habilite no painel da Focus.`,
        detalhes: body,
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
