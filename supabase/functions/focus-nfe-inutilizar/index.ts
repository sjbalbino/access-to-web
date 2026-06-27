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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(SUPABASE_URL!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    if (!(roles || []).some((r: { role: string }) => ["admin", "gerente", "operador"].includes(r.role))) {
      return new Response(JSON.stringify({ error: "Permissão insuficiente" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { emitenteId, serie, numeroInicial, numeroFinal, justificativa } = await req.json();

    if (!emitenteId) throw new Error("emitenteId é obrigatório");
    if (!serie && serie !== 0) throw new Error("serie é obrigatória");
    if (!numeroInicial || !numeroFinal) throw new Error("numero_inicial e numero_final são obrigatórios");
    if (Number(numeroFinal) < Number(numeroInicial)) throw new Error("numero_final deve ser maior ou igual ao numero_inicial");
    if (!justificativa || justificativa.length < 15) {
      throw new Error("Justificativa é obrigatória e deve ter no mínimo 15 caracteres");
    }

    // Buscar emitente: ambiente, token, CNPJ/CPF do produtor
    const { data: emitente, error: emitErr } = await admin
      .from("emitentes_nfe")
      .select(`
        id, ambiente, granja_id, inscricao_produtor_id,
        emitentes_nfe_credentials(api_access_token, api_access_token_homologacao),
        inscricao:inscricoes_produtor!emitentes_nfe_inscricao_produtor_id_fkey(cpf_cnpj),
        granja:granjas(tenant_id)
      `)
      .eq("id", emitenteId)
      .maybeSingle();

    if (emitErr || !emitente) {
      return new Response(JSON.stringify({ success: false, error: "Emitente não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tenant guard
    const { data: profile } = await admin.from("profiles").select("tenant_id, is_super_admin_original").eq("id", userData.user.id).maybeSingle();
    const isSuper = profile?.is_super_admin_original === true;
    const granjaTenant = (emitente as any)?.granja?.tenant_id;
    if (!isSuper && profile?.tenant_id && granjaTenant && profile.tenant_id !== granjaTenant) {
      return new Response(JSON.stringify({ error: "Emitente não pertence ao tenant" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ambiente = (emitente as any).ambiente;
    const credObj = Array.isArray((emitente as any).emitentes_nfe_credentials)
      ? (emitente as any).emitentes_nfe_credentials?.[0]
      : (emitente as any).emitentes_nfe_credentials;
    const token = ambiente === 2 ? credObj?.api_access_token_homologacao : credObj?.api_access_token;

    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        error: `Token de ${ambiente === 2 ? "homologação" : "produção"} da Focus NFe não configurado para este emitente.`,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const cpfCnpjRaw = (emitente as any)?.inscricao?.cpf_cnpj;
    const cnpj = (cpfCnpjRaw || "").replace(/\D/g, "");
    if (!cnpj) {
      return new Response(JSON.stringify({
        success: false,
        error: "CNPJ/CPF do emitente não encontrado na inscrição do produtor.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const baseUrl = getBaseUrl(ambiente);
    const body = {
      cnpj,
      serie: String(serie),
      numero_inicial: String(numeroInicial),
      numero_final: String(numeroFinal),
      justificativa,
    };
    console.log("Inutilizando numeração:", body);

    const response = await fetch(`${baseUrl}/v2/nfe_inutilizacao`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${token}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    console.log("Resposta Focus NFe inutilização:", JSON.stringify(data));

    if (!response.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: data?.mensagem || data?.erros?.[0]?.mensagem || "Erro ao inutilizar numeração",
        details: data,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Avançar numero_atual_nfe se a faixa inutilizada começar a partir do próximo
    try {
      const { data: cur } = await admin.from("emitentes_nfe").select("numero_atual_nfe").eq("id", emitenteId).maybeSingle();
      const atual = Number(cur?.numero_atual_nfe || 0);
      const fim = Number(numeroFinal);
      if (fim > atual) {
        await admin.from("emitentes_nfe").update({ numero_atual_nfe: fim }).eq("id", emitenteId);
      }
    } catch (e) {
      console.error("Falha ao atualizar numero_atual_nfe:", e);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na inutilização:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
