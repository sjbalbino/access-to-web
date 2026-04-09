import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const getBaseUrl = (ambiente: number | null | undefined) => {
  return ambiente === 2
    ? "https://homologacao.focusnfe.com.br"
    : "https://api.focusnfe.com.br";
};

async function getEmitenteCredentials(granjaId: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: emitente, error } = await supabase
    .from("emitentes_nfe")
    .select("api_access_token, ambiente")
    .eq("granja_id", granjaId)
    .maybeSingle();

  if (error) throw new Error("Erro ao buscar emitente: " + error.message);
  if (!emitente?.api_access_token) {
    throw new Error("Token da Focus NFe não configurado para este emitente.");
  }

  return {
    token: emitente.api_access_token,
    ambiente: emitente.ambiente,
  };
}

async function getGranjaCnpj(granjaId: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Try granja first
  const { data, error } = await supabase
    .from("granjas")
    .select("cnpj, cpf")
    .eq("id", granjaId)
    .single();

  if (error) throw new Error("Erro ao buscar granja: " + error.message);

  let cnpj = (data.cnpj || data.cpf || "").replace(/\D/g, "");

  // Fallback: get from inscricao emitente principal
  if (!cnpj) {
    const { data: insc } = await supabase
      .from("inscricoes_produtor")
      .select("cpf_cnpj")
      .eq("granja_id", granjaId)
      .eq("is_emitente_principal", true)
      .maybeSingle();

    if (insc?.cpf_cnpj) {
      cnpj = insc.cpf_cnpj.replace(/\D/g, "");
    }
  }

  if (!cnpj) throw new Error("Granja não possui CNPJ/CPF cadastrado. Verifique o cadastro da granja ou da inscrição emitente principal.");

  return cnpj;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, granjaId, chave, tipo, versao } = await req.json();

    if (!granjaId) throw new Error("granjaId é obrigatório");
    if (!action) throw new Error("action é obrigatório");

    const { token, ambiente } = await getEmitenteCredentials(granjaId);
    const baseUrl = getBaseUrl(ambiente);
    const authHeader = `Basic ${btoa(`${token}:`)}`;

    let result: unknown;

    switch (action) {
      case "consultar": {
        const cnpj = await getGranjaCnpj(granjaId);
        // versao=1 retorna resumos, versao=2 retorna completas (se disponível)
        const v = versao || 1;
        const url = `${baseUrl}/v2/nfes_recebidas?cnpj=${cnpj}&versao=${v}`;
        console.log("MD-e Consultar:", url);

        const response = await fetch(url, {
          method: "GET",
          headers: { Authorization: authHeader },
        });
        result = await response.json();
        break;
      }

      case "manifestar": {
        if (!chave) throw new Error("chave é obrigatória para manifestar");
        if (!tipo) throw new Error("tipo é obrigatório (ciencia, confirmacao, desconhecimento, nao_realizada)");

        const url = `${baseUrl}/v2/nfes_recebidas/${chave}/manifesto`;
        console.log("MD-e Manifestar:", url, "tipo:", tipo);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tipo }),
        });
        result = await response.json();
        break;
      }

      case "download_xml": {
        if (!chave) throw new Error("chave é obrigatória para download");

        const url = `${baseUrl}/v2/nfes_recebidas/${chave}.xml`;
        console.log("MD-e Download XML:", url);

        const response = await fetch(url, {
          method: "GET",
          headers: { Authorization: authHeader },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro ao baixar XML: ${response.status} - ${errorText}`);
        }

        const xmlContent = await response.text();
        return new Response(xmlContent, {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/xml",
          },
        });
      }

      case "download_danfe": {
        if (!chave) throw new Error("chave é obrigatória para download");

        const url = `${baseUrl}/v2/nfes_recebidas/${chave}.pdf`;
        console.log("MD-e Download DANFe:", url);

        const response = await fetch(url, {
          method: "GET",
          headers: { Authorization: authHeader },
          redirect: "follow",
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro ao baixar DANFe: ${response.status} - ${errorText}`);
        }

        const pdfData = await response.arrayBuffer();
        return new Response(pdfData, {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/pdf",
          },
        });
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro MD-e:", error);
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
