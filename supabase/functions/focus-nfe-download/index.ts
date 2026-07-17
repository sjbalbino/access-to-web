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

    const { ref, tipo, notaFiscalId } = await req.json();

    if (!ref) {
      throw new Error("ref é obrigatório");
    }

    if (!tipo || !["xml", "danfe", "xml_cancelamento", "cce_pdf", "cce_xml"].includes(tipo)) {
      throw new Error("tipo inválido");
    }


    // Tenant isolation
    if (notaFiscalId) {
      const adminCli = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      const caller = await getCallerTenant(adminCli, _userData.user.id);
      const guard = await assertNotaFiscalTenant(adminCli, notaFiscalId, caller);
      if (!guard.ok) return tenantErrorResponse(guard, corsHeaders);
    }

    console.log("Baixando", tipo, "para NF-e:", ref);

    // Buscar ambiente e token do emitente
    let ambiente: number | null | undefined;
    let emitenteToken: string | null | undefined;

    if (notaFiscalId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
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

    // Primeiro consultar a nota para obter as URLs
    const baseUrl = getBaseUrl(ambiente);
    console.log("URL Base:", baseUrl);

    const consultaResponse = await fetch(`${baseUrl}/v2/nfe/${ref}`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${btoa(`${emitenteToken}:`)}`,
      },
    });

    const consultaData = await consultaResponse.json();
    console.log("Dados da nota:", JSON.stringify(consultaData, null, 2));

    let downloadUrl: string | undefined;
    let contentType = "application/octet-stream";
    let filename = `arquivo_${ref}`;

    switch (tipo) {
      case "xml":
        downloadUrl = consultaData.caminho_xml_nota_fiscal;
        contentType = "application/xml";
        filename = `nfe_${ref}.xml`;
        break;
      case "danfe":
        downloadUrl = consultaData.caminho_danfe;
        contentType = "application/pdf";
        filename = `danfe_${ref}.pdf`;
        break;
      case "xml_cancelamento":
        downloadUrl = consultaData.caminho_xml_cancelamento;
        contentType = "application/xml";
        filename = `nfe_cancelamento_${ref}.xml`;
        break;
      case "cce_pdf":
        downloadUrl = consultaData.caminho_pdf_carta_correcao || consultaData.caminho_danfe_carta_correcao;
        contentType = "application/pdf";
        filename = `cce_${ref}.pdf`;
        break;
      case "cce_xml":
        downloadUrl = consultaData.caminho_xml_carta_correcao;
        contentType = "application/xml";
        filename = `cce_${ref}.xml`;
        break;
    }




    if (!downloadUrl) {
      // Fallback: para DANFE de nota cancelada/autorizada, tentar endpoint direto .pdf
      if (tipo === "danfe") {
        const altUrl = `${baseUrl}/v2/nfe/${ref}.pdf`;
        console.log("caminho_danfe ausente. Tentando endpoint alternativo:", altUrl);
        const altResp = await fetch(altUrl, {
          headers: { Authorization: `Basic ${btoa(`${emitenteToken}:`)}` },
        });
        if (altResp.ok) {
          const altBuf = await altResp.arrayBuffer();
          return new Response(altBuf, {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="danfe_${ref}.pdf"`,
            },
          });
        }
        console.log("Fallback DANFE falhou:", altResp.status);
      }
      const statusNota = consultaData.status || "desconhecido";
      throw new Error(
        `DANFE não disponível na Focus NFe para esta nota (status: ${statusNota}). ` +
        `Aguarde alguns segundos após o cancelamento/autorização e tente novamente.`
      );
    }

    // Baixar o arquivo - usar URL completa
    const fullDownloadUrl = downloadUrl.startsWith('http') ? downloadUrl : `${baseUrl}${downloadUrl}`;
    console.log("URL de download:", fullDownloadUrl);
    
    const downloadResponse = await fetch(fullDownloadUrl, {
      headers: {
        Authorization: `Basic ${btoa(`${emitenteToken}:`)}`,
      },
    });

    if (!downloadResponse.ok) {
      throw new Error(`Erro ao baixar ${tipo}: ${downloadResponse.status}`);
    }

    const fileContent = await downloadResponse.arrayBuffer();

    return new Response(fileContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType!,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Erro ao baixar arquivo:", error);
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
