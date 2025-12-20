import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOCUSNFE_TOKEN = Deno.env.get("FOCUSNFE_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Determina ambiente baseado no token (homologação começa com "T")
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

    const { notaFiscalId, notaData } = await req.json();

    if (!notaFiscalId || !notaData) {
      throw new Error("notaFiscalId e notaData são obrigatórios");
    }

    console.log("Emitindo NF-e:", notaFiscalId);
    console.log("Dados:", JSON.stringify(notaData, null, 2));

    // Gerar referência única para a nota
    const ref = `nfe_${notaFiscalId}`;

    // Chamar API Focus NFe
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/v2/nfe?ref=${ref}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${FOCUSNFE_TOKEN}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notaData),
    });

    const responseData = await response.json();
    console.log("Resposta Focus NFe:", JSON.stringify(responseData, null, 2));

    // Inicializar cliente Supabase
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    if (!response.ok) {
      // Atualizar nota com erro
      await supabase
        .from("notas_fiscais")
        .update({
          status: "rejeitada",
          motivo_status: responseData.mensagem || responseData.erros?.join("; ") || "Erro desconhecido",
        })
        .eq("id", notaFiscalId);

      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.mensagem || "Erro ao emitir NF-e",
          details: responseData,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Atualizar nota com dados da API
    const updateData: Record<string, unknown> = {
      status: responseData.status || "processando",
      uuid_api: ref,
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

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
        ref,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro ao emitir NF-e:", error);
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
