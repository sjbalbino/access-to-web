// Emite Carta de Correção Eletrônica (CC-e) de NF-e via ACBr API Nuvem.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertNotaFiscalTenant, getCallerTenant, tenantErrorResponse } from "../_shared/tenant-guard.ts";
import { acbrFetch, buscarCredenciaisAcbr } from "../_shared/acbr-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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
    const _adminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: _roles } = await _adminClient.from("user_roles").select("role").eq("user_id", _userData.user.id);
    if (!(_roles || []).some((r: { role: string }) => ["admin", "gerente", "operador"].includes(r.role))) {
      return new Response(JSON.stringify({ error: "Permissão insuficiente" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { ref, notaFiscalId, correcao } = await req.json();

    if (!ref) {
      throw new Error("ref é obrigatório");
    }

    if (!correcao || correcao.length < 15) {
      throw new Error("Correção é obrigatória e deve ter no mínimo 15 caracteres");
    }

    // Tenant isolation
    if (notaFiscalId) {
      const caller = await getCallerTenant(_adminClient, _userData.user.id);
      const guard = await assertNotaFiscalTenant(_adminClient, notaFiscalId, caller);
      if (!guard.ok) return tenantErrorResponse(guard, corsHeaders);
    }

    console.log("Emitindo Carta de Correção via ACBr API para NF-e:", ref);

    // deno-lint-ignore no-explicit-any
    let supabase: any = null;
    let emitenteId: string | null = null;

    if (notaFiscalId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: notaData } = await supabase
        .from("notas_fiscais")
        .select("emitente_id")
        .eq("id", notaFiscalId)
        .maybeSingle();

      if (!notaData) {
        return new Response(
          JSON.stringify({ success: false, error: "Nota fiscal não encontrada no banco de dados" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      emitenteId = notaData.emitente_id;
    }

    if (!emitenteId) {
      return new Response(
        JSON.stringify({ success: false, error: "Nota fiscal sem emitente vinculado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cred = await buscarCredenciaisAcbr(supabase, emitenteId);
    if (!cred) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Client ID / Client Secret da ACBr API não configurados para este emitente.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const response = await acbrFetch(cred, `/nfe/${ref}/carta-correcao`, {
      method: "POST",
      body: { correcao },
    });

    const responseData = await response.json().catch(() => ({}));
    console.log("Resposta ACBr API:", JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.mensagem || "Erro ao emitir carta de correção",
          details: responseData,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Registrar a correção nas informações complementares da nota
    if (notaFiscalId && supabase) {
      const { data: nota } = await supabase
        .from("notas_fiscais")
        .select("info_complementar")
        .eq("id", notaFiscalId)
        .single();

      const infoAtual = nota?.info_complementar || "";
      const novaInfo = `${infoAtual}\n\nCarta de Correção (${new Date().toLocaleDateString("pt-BR")}): ${correcao}`.trim();

      const { error: updateError } = await supabase
        .from("notas_fiscais")
        .update({ info_complementar: novaInfo })
        .eq("id", notaFiscalId);

      if (updateError) {
        console.error("Erro ao atualizar nota fiscal no banco:", updateError);
      } else {
        console.log("Nota fiscal atualizada com sucesso no banco de dados");
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Erro ao emitir carta de correção via ACBr API:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
