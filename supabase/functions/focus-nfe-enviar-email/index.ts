import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const getBaseUrl = (ambiente: number | null | undefined) =>
  ambiente === 2 ? "https://homologacao.focusnfe.com.br" : "https://api.focusnfe.com.br";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    const { notaFiscalId, emails } = await req.json();

    if (!notaFiscalId || !Array.isArray(emails) || emails.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "notaFiscalId e emails (array não vazio) são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const emailsLimpos = Array.from(
      new Set(
        (emails as unknown[])
          .filter((e): e is string => typeof e === "string")
          .map((e) => e.trim())
          .filter((e) => EMAIL_RE.test(e)),
      ),
    );

    if (emailsLimpos.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Nenhum email válido informado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: nota } = await supabase
      .from("notas_fiscais")
      .select(`
        uuid_api,
        status,
        emitente_id,
        emitentes_nfe!notas_fiscais_emitente_id_fkey(
          ambiente,
          emitentes_nfe_credentials(api_access_token, api_access_token_homologacao)
        )
      `)
      .eq("id", notaFiscalId)
      .maybeSingle();

    if (!nota) {
      return new Response(
        JSON.stringify({ success: false, error: "Nota fiscal não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (nota.status !== "autorizada" && nota.status !== "autorizado") {
      return new Response(
        JSON.stringify({ success: false, error: `Só é possível enviar emails de NFe autorizada (status atual: ${nota.status})` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!nota.uuid_api) {
      return new Response(
        JSON.stringify({ success: false, error: "NFe sem referência (uuid_api) registrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const emit = (nota as any).emitentes_nfe;
    const ambiente: number | null = emit?.ambiente ?? null;
    const cred = Array.isArray(emit?.emitentes_nfe_credentials)
      ? emit?.emitentes_nfe_credentials?.[0]
      : emit?.emitentes_nfe_credentials;
    const token = ambiente === 2 ? cred?.api_access_token_homologacao : cred?.api_access_token;

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Token Focus NFe não configurado para o ambiente do emitente" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const baseUrl = getBaseUrl(ambiente);
    const url = `${baseUrl}/v2/nfe/${nota.uuid_api}/email`;

    console.log("Enviando email NFe:", url, "Para:", emailsLimpos);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${token}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ emails: emailsLimpos }),
    });

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    console.log("Resposta Focus:", response.status, text);

    if (!response.ok) {
      const err = (data as any)?.mensagem || (data as any)?.erros?.join?.("; ") || text || "Erro ao enviar email";
      return new Response(
        JSON.stringify({ success: false, error: err, details: data }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, data, emails: emailsLimpos }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
