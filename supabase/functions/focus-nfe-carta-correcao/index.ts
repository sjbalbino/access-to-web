import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Determina ambiente baseado no cadastro do emitente
const getBaseUrl = (ambiente: number | null | undefined) => {
  const isHomologacao = ambiente === 2;
  console.log("Ambiente do emitente:", isHomologacao ? "HOMOLOGAÇÃO" : "PRODUÇÃO");
  if (isHomologacao) {
    return "https://homologacao.focusnfe.com.br";
  }
  return "https://api.focusnfe.com.br";
};

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

    console.log("Emitindo Carta de Correção para NF-e:", ref);

    // Buscar ambiente e token do emitente
    let ambiente: number | null | undefined;
    let emitenteToken: string | null | undefined;
    // deno-lint-ignore no-explicit-any
    let supabase: any = null;

    if (notaFiscalId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { data: notaData } = await supabase
        .from("notas_fiscais")
        .select(`
          emitente_id,
          emitentes_nfe!notas_fiscais_emitente_id_fkey(ambiente, emitentes_nfe_credentials(api_access_token, api_access_token_homologacao))
        `)
        .eq("id", notaFiscalId)
        .maybeSingle();

      // Verificar se a nota existe
      if (!notaData) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Nota fiscal não encontrada no banco de dados",
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const emitenteData = (notaData as unknown as { emitentes_nfe?: { ambiente: number | null; emitentes_nfe_credentials?: Array<{ api_access_token: string | null; api_access_token_homologacao: string | null }> | { api_access_token: string | null; api_access_token_homologacao: string | null } | null } })?.emitentes_nfe;
      ambiente = emitenteData?.ambiente;
      const credObj = Array.isArray(emitenteData?.emitentes_nfe_credentials) ? emitenteData?.emitentes_nfe_credentials?.[0] : emitenteData?.emitentes_nfe_credentials;
      emitenteToken = ambiente === 2 ? credObj?.api_access_token_homologacao : credObj?.api_access_token;
    }

    const ambienteLabel = ambiente === 2 ? "homologação" : "produção";
    // Verificar se o token do emitente está configurado
    if (!emitenteToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Token de ${ambienteLabel} da Focus NFe não configurado para este emitente. Configure o token no cadastro do emitente.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const baseUrl = getBaseUrl(ambiente);
    console.log("URL Base:", baseUrl);

    const response = await fetch(`${baseUrl}/v2/nfe/${ref}/carta_correcao`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${emitenteToken}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ correcao }),
    });

    const responseData = await response.json();
    console.log("Resposta Focus NFe:", JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.mensagem || "Erro ao emitir carta de correção",
          details: responseData,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Atualizar info no banco se necessário
    if (notaFiscalId && supabase) {
      // Adicionar correção às informações complementares
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
      JSON.stringify({
        success: true,
        data: responseData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro ao emitir carta de correção:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
