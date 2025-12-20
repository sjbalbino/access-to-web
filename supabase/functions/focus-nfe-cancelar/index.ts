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

    const { ref, notaFiscalId, justificativa } = await req.json();

    if (!ref) {
      throw new Error("ref é obrigatório");
    }

    if (!justificativa || justificativa.length < 15) {
      throw new Error("Justificativa é obrigatória e deve ter no mínimo 15 caracteres");
    }

    console.log("Cancelando NF-e:", ref);

    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/v2/nfe/${ref}`, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${btoa(`${FOCUSNFE_TOKEN}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ justificativa }),
    });

    const responseData = await response.json();
    console.log("Resposta Focus NFe:", JSON.stringify(responseData, null, 2));

    // Atualizar no banco
    if (notaFiscalId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const updateData: Record<string, unknown> = {
        status: responseData.status || "cancelada",
        motivo_status: justificativa,
      };

      if (responseData.caminho_xml_cancelamento) {
        updateData.xml_cancelamento_url = responseData.caminho_xml_cancelamento;
      }

      await supabase
        .from("notas_fiscais")
        .update(updateData)
        .eq("id", notaFiscalId);
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.mensagem || "Erro ao cancelar NF-e",
          details: responseData,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
    console.error("Erro ao cancelar NF-e:", error);
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
