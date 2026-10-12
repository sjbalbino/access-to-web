// Cancela NF-e autorizada via ACBr API Nuvem (evento de cancelamento SEFAZ).
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

    const { ref, notaFiscalId, justificativa: justificativaRaw } = await req.json();

    if (!ref) {
      throw new Error("ref é obrigatório");
    }

    // A SEFAZ exige no mínimo 15 caracteres úteis na justificativa
    const justificativa = typeof justificativaRaw === "string" ? justificativaRaw.trim() : "";
    if (justificativa.length < 15) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Justificativa é obrigatória e deve ter no mínimo 15 caracteres (sem contar espaços no início/fim)",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Tenant isolation
    if (notaFiscalId) {
      const caller = await getCallerTenant(_adminClient, _userData.user.id);
      const guard = await assertNotaFiscalTenant(_adminClient, notaFiscalId, caller);
      if (!guard.ok) return tenantErrorResponse(guard, corsHeaders);
    }

    console.log("Cancelando NF-e via ACBr API:", ref);

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

    const response = await acbrFetch(cred, `/nfe/${ref}`, {
      method: "DELETE",
      body: { justificativa },
    });

    const responseData = await response.json().catch(() => ({}));
    console.log("Resposta ACBr API:", JSON.stringify(responseData, null, 2));

    // Só consideramos cancelado quando a ACBr/SEFAZ confirma
    const statusApi: string = typeof responseData?.status === "string" ? responseData.status : "";
    const cancelamentoConfirmado =
      response.ok && statusApi !== "" && !statusApi.startsWith("erro");

    const mensagemErro =
      responseData?.mensagem_sefaz ||
      responseData?.mensagem ||
      responseData?.erros?.[0]?.mensagem ||
      (statusApi ? `Cancelamento não homologado (status: ${statusApi})` : "Erro ao cancelar NF-e");

    if (!cancelamentoConfirmado) {
      console.error("Cancelamento NÃO confirmado pela SEFAZ:", mensagemErro);

      if (notaFiscalId && supabase) {
        const { error: motivoErr } = await supabase
          .from("notas_fiscais")
          .update({ motivo_status: `Falha no cancelamento: ${mensagemErro}` })
          .eq("id", notaFiscalId);
        if (motivoErr) console.error("Erro ao gravar motivo_status:", motivoErr);
      }

      return new Response(
        JSON.stringify({ success: false, error: mensagemErro, details: responseData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Atualizar no banco (somente com cancelamento confirmado)
    if (notaFiscalId && supabase) {
      let canceladoPorNome: string | null = null;
      try {
        const { data: perfil } = await supabase
          .from("profiles")
          .select("nome, email")
          .eq("id", _userData.user.id)
          .maybeSingle();
        canceladoPorNome = perfil?.nome || perfil?.email || _userData.user.email || null;
      } catch (_) { /* ignore */ }

      const updateData: Record<string, unknown> = {
        status: statusApi || "cancelada",
        motivo_status: justificativa,
        cancelado_por: _userData.user.id,
        cancelado_por_nome: canceladoPorNome,
        cancelado_em: new Date().toISOString(),
        cancelado_motivo: justificativa,
      };

      if (responseData.caminho_xml_cancelamento) {
        updateData.xml_cancelamento_url = responseData.caminho_xml_cancelamento;
      }

      const { error: updateError } = await supabase
        .from("notas_fiscais")
        .update(updateData)
        .eq("id", notaFiscalId);

      if (updateError) {
        console.error("Erro ao atualizar nota fiscal no banco:", updateError);
      } else {
        console.log("Nota fiscal atualizada com sucesso no banco de dados");

        // Propagar cancelamento para tabelas relacionadas
        const { error: delNotasDepError } = await supabase
          .from("notas_deposito_emitidas")
          .delete()
          .eq("nota_fiscal_id", notaFiscalId);
        if (delNotasDepError) console.error("Erro ao deletar notas_deposito_emitidas:", delNotasDepError);

        const { error: updDevError } = await supabase
          .from("devolucoes_deposito")
          .update({ status: "cancelada" })
          .eq("nota_fiscal_id", notaFiscalId);
        if (updDevError) console.error("Erro ao cancelar devolucoes_deposito:", updDevError);

        const { error: updCompraError } = await supabase
          .from("compras_cereais")
          .update({ status: "cancelada" })
          .eq("nota_fiscal_id", notaFiscalId);
        if (updCompraError) console.error("Erro ao cancelar compras_cereais:", updCompraError);

        const { error: updRemessaError } = await supabase
          .from("remessas_venda")
          .update({ status: "cancelada" })
          .eq("nota_fiscal_id", notaFiscalId);
        if (updRemessaError) console.error("Erro ao cancelar remessas_venda:", updRemessaError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Erro ao cancelar NF-e via ACBr API:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
