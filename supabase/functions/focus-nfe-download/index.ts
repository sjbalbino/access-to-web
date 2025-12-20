import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOCUSNFE_TOKEN = Deno.env.get("FOCUSNFE_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Determina ambiente baseado no cadastro do emitente (não mais pelo token)
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
    if (!FOCUSNFE_TOKEN) {
      throw new Error("FOCUSNFE_TOKEN não configurado");
    }

    const { ref, tipo, notaFiscalId } = await req.json();

    if (!ref) {
      throw new Error("ref é obrigatório");
    }

    if (!tipo || !["xml", "danfe", "xml_cancelamento"].includes(tipo)) {
      throw new Error("tipo deve ser 'xml', 'danfe' ou 'xml_cancelamento'");
    }

    console.log("Baixando", tipo, "para NF-e:", ref);

    // Buscar ambiente do emitente
    let ambiente: number | null | undefined;

    if (notaFiscalId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { data: notaData } = await supabase
        .from("notas_fiscais")
        .select(`
          emitente_id,
          emitentes_nfe!notas_fiscais_emitente_id_fkey(ambiente)
        `)
        .eq("id", notaFiscalId)
        .maybeSingle();

      // Cast para unknown primeiro para evitar erros de tipo
      const emitenteData = (notaData as unknown as { emitentes_nfe?: { ambiente: number | null } })?.emitentes_nfe;
      ambiente = emitenteData?.ambiente;
    }

    // Primeiro consultar a nota para obter as URLs
    const baseUrl = getBaseUrl(ambiente);
    console.log("URL Base:", baseUrl);

    const consultaResponse = await fetch(`${baseUrl}/v2/nfe/${ref}`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${btoa(`${FOCUSNFE_TOKEN}:`)}`,
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
    }

    if (!downloadUrl) {
      throw new Error(`URL do ${tipo} não disponível. Status da nota: ${consultaData.status}`);
    }

    // Baixar o arquivo
    const downloadResponse = await fetch(downloadUrl, {
      headers: {
        Authorization: `Basic ${btoa(`${FOCUSNFE_TOKEN}:`)}`,
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
