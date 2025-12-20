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

    const { ref, notaFiscalId, correcao } = await req.json();

    if (!ref) {
      throw new Error("ref é obrigatório");
    }

    if (!correcao || correcao.length < 15) {
      throw new Error("Correção é obrigatória e deve ter no mínimo 15 caracteres");
    }

    console.log("Emitindo Carta de Correção para NF-e:", ref);

    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/v2/nfe/${ref}/carta_correcao`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${FOCUSNFE_TOKEN}:`)}`,
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
    if (notaFiscalId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Adicionar correção às informações complementares
      const { data: nota } = await supabase
        .from("notas_fiscais")
        .select("info_complementar")
        .eq("id", notaFiscalId)
        .single();

      const infoAtual = nota?.info_complementar || "";
      const novaInfo = `${infoAtual}\n\nCarta de Correção (${new Date().toLocaleDateString("pt-BR")}): ${correcao}`.trim();

      await supabase
        .from("notas_fiscais")
        .update({ info_complementar: novaInfo })
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
