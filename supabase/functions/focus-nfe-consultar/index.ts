import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertNotaFiscalTenant, getCallerTenant, tenantErrorResponse } from "../_shared/tenant-guard.ts";

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

    const { ref, notaFiscalId } = await req.json();

    if (!ref) {
      throw new Error("ref é obrigatório");
    }

    // Tenant isolation
    if (notaFiscalId) {
      const adminCli = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      const caller = await getCallerTenant(adminCli, _userData.user.id);
      const guard = await assertNotaFiscalTenant(adminCli, notaFiscalId, caller);
      if (!guard.ok) return tenantErrorResponse(guard, corsHeaders);
    }

    console.log("Consultando NF-e:", ref);

    // Buscar ambiente e token do emitente se temos o ID da nota
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

    const response = await fetch(`${baseUrl}/v2/nfe/${ref}`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${btoa(`${emitenteToken}:`)}`,
      },
    });

    const responseData = await response.json();
    console.log("Resposta Focus NFe:", JSON.stringify(responseData, null, 2));

    // Se temos o ID da nota, atualizar no banco
    if (notaFiscalId && supabase) {
      const updateData: Record<string, unknown> = {
        status: responseData.status,
      };

      if (responseData.chave_nfe) {
        updateData.chave_acesso = responseData.chave_nfe;
      }
      if (responseData.numero) {
        updateData.numero = responseData.numero;
      }
      if (responseData.serie) {
        updateData.serie = responseData.serie;
      }
      if (responseData.protocolo) {
        updateData.protocolo = responseData.protocolo;
      }
      if (responseData.caminho_xml_nota_fiscal) {
        updateData.xml_url = responseData.caminho_xml_nota_fiscal;
      }
      if (responseData.caminho_danfe) {
        updateData.danfe_url = responseData.caminho_danfe;
      }
      if (responseData.mensagem_sefaz) {
        updateData.motivo_status = responseData.mensagem_sefaz;
      }

      const { error: updateError } = await supabase
        .from("notas_fiscais")
        .update(updateData)
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
    console.error("Erro ao consultar NF-e:", error);
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
