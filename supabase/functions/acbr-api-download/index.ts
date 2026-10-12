// Baixa DANFE (PDF), XML, XML de cancelamento e CC-e de NF-e via ACBr API Nuvem.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertNotaFiscalTenant, getCallerTenant, tenantErrorResponse } from "../_shared/tenant-guard.ts";
import { acbrBaseUrl, acbrFetch, buscarCredenciaisAcbr, obterTokenAcbr } from "../_shared/acbr-api.ts";

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

    console.log("Baixando", tipo, "para NF-e via ACBr API:", ref);

    let emitenteId: string | null = null;
    let storedDanfe: string | null = null;
    let storedXml: string | null = null;

    if (notaFiscalId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: notaData } = await supabase
        .from("notas_fiscais")
        .select("emitente_id, danfe_url, xml_url")
        .eq("id", notaFiscalId)
        .maybeSingle();

      if (!notaData) {
        return new Response(
          JSON.stringify({ success: false, error: "Nota fiscal não encontrada no banco de dados" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      emitenteId = notaData.emitente_id;
      storedDanfe = (notaData as { danfe_url?: string | null }).danfe_url ?? null;
      storedXml = (notaData as { xml_url?: string | null }).xml_url ?? null;
    }

    if (!emitenteId || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Nota fiscal sem emitente vinculado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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

    // Consultar a nota para obter as URLs dos arquivos
    const consultaResponse = await acbrFetch(cred, `/nfe/${ref}`);
    const consultaData = await consultaResponse.json().catch(() => ({}));
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

    // Fallback: caminhos gravados na nota
    if (!downloadUrl) {
      if (tipo === "danfe" && storedDanfe) downloadUrl = storedDanfe;
      if (tipo === "xml" && storedXml) downloadUrl = storedXml;
      if (downloadUrl) console.log("Usando caminho gravado na nota:", downloadUrl);
    }

    if (!downloadUrl) {
      // Fallback: endpoints diretos da ACBr API (/nfe/{ref}/pdf e /nfe/{ref}/xml)
      if (tipo === "danfe" || tipo === "xml") {
        const direto = tipo === "danfe" ? "pdf" : "xml";
        const altResp = await acbrFetch(cred, `/nfe/${ref}/${direto}`, {
          accept: tipo === "danfe" ? "application/pdf" : "application/xml",
        });
        if (altResp.ok) {
          const altBuf = await altResp.arrayBuffer();
          return new Response(altBuf, {
            headers: {
              ...corsHeaders,
              "Content-Type": contentType,
              "Content-Disposition": `attachment; filename="${filename}"`,
            },
          });
        }
        console.log("Fallback direto falhou:", altResp.status);
      }
      const rotulo = tipo === "danfe" ? "DANFE" : tipo.toUpperCase().replace("_", " ");
      if (consultaData?.codigo === "nao_encontrado") {
        throw new Error(
          `${rotulo} não encontrado: a ACBr API não localiza esta nota e não há arquivo gravado no sistema.`,
        );
      }
      const statusNota = consultaData.status || "desconhecido";
      throw new Error(
        `${rotulo} não disponível na ACBr API para esta nota (status: ${statusNota}). ` +
        `Aguarde alguns segundos após o cancelamento/autorização e tente novamente.`,
      );
    }

    // Baixar o arquivo
    const token = await obterTokenAcbr(cred);
    const fullDownloadUrl = downloadUrl.startsWith("http") ? downloadUrl : `${acbrBaseUrl(cred.ambiente)}${downloadUrl}`;
    console.log("URL de download:", fullDownloadUrl);

    const downloadResponse = await fetch(fullDownloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!downloadResponse.ok) {
      throw new Error(`Erro ao baixar ${tipo}: ${downloadResponse.status}`);
    }

    const fileContent = await downloadResponse.arrayBuffer();

    return new Response(fileContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Erro ao baixar arquivo via ACBr API:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
