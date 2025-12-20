import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOCUSNFE_TOKEN = Deno.env.get("FOCUSNFE_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const getBaseUrl = () => {
  if (FOCUSNFE_TOKEN?.startsWith("T")) {
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

    const { ref, notaFiscalId } = await req.json();

    if (!ref) {
      throw new Error("ref é obrigatório");
    }

    console.log("Consultando NF-e:", ref);

    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/v2/nfe/${ref}`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${btoa(`${FOCUSNFE_TOKEN}:`)}`,
      },
    });

    const responseData = await response.json();
    console.log("Resposta Focus NFe:", JSON.stringify(responseData, null, 2));

    // Se temos o ID da nota, atualizar no banco
    if (notaFiscalId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

      await supabase
        .from("notas_fiscais")
        .update(updateData)
        .eq("id", notaFiscalId);
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
