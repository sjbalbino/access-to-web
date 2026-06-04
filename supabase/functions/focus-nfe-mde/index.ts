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

async function getInscricaoContext(inscricaoId: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: insc, error } = await supabase
    .from("inscricoes_produtor")
    .select("cpf_cnpj, emitente_id, granja_id")
    .eq("id", inscricaoId)
    .maybeSingle();

  if (error) throw new Error("Erro ao buscar inscrição: " + error.message);
  if (!insc) throw new Error("Inscrição não encontrada.");
  if (!insc.emitente_id) throw new Error("Inscrição sem emitente NF-e configurado.");

  const doc = (insc.cpf_cnpj || "").replace(/\D/g, "");
  let docType: "cpf" | "cnpj";
  if (doc.length === 14) docType = "cnpj";
  else if (doc.length === 11) docType = "cpf";
  else throw new Error("CPF/CNPJ inválido na inscrição.");

  const { data: emitente, error: emErr } = await supabase
    .from("emitentes_nfe")
    .select("ambiente")
    .eq("id", insc.emitente_id)
    .maybeSingle();

  if (emErr) throw new Error("Erro ao buscar emitente: " + emErr.message);
  if (!emitente) throw new Error("Emitente vinculado à inscrição não encontrado.");

  const { data: cred, error: credErr } = await supabase
    .from("emitentes_nfe_credentials")
    .select("api_access_token, api_access_token_homologacao")
    .eq("emitente_id", insc.emitente_id)
    .maybeSingle();

  if (credErr) throw new Error("Erro ao buscar credenciais: " + credErr.message);
  const ambienteLabel = emitente.ambiente === 2 ? "homologação" : "produção";
  const token = emitente.ambiente === 2 ? cred?.api_access_token_homologacao : cred?.api_access_token;
  if (!token) {
    throw new Error(`Token de ${ambienteLabel} da Focus NFe não configurado para este emitente.`);
  }

  return {
    token,
    ambiente: emitente.ambiente,
    doc,
    docType,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth (usuário logado) ---
    const _jwtHeader = req.headers.get("Authorization");
    if (!_jwtHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const _authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: _jwtHeader } },
    });
    const { data: _userData, error: _userErr } = await _authClient.auth.getUser();
    if (_userErr || !_userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, inscricaoId, chave, tipo, versao } = await req.json();

    if (!inscricaoId) throw new Error("inscricaoId é obrigatório");
    if (!action) throw new Error("action é obrigatório");

    const { token, ambiente, doc, docType } = await getInscricaoContext(inscricaoId);
    const baseUrl = getBaseUrl(ambiente);
    const authHeader = `Basic ${btoa(`${token}:`)}`;

    let result: unknown;

    switch (action) {
      case "consultar": {
        const v = versao || 1;
        const url = `${baseUrl}/v2/nfes_recebidas?${docType}=${doc}&versao=${v}`;
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

        const url = `${baseUrl}/v2/nfes_recebidas/${chave}.xml?completa=1`;
        console.log("MD-e Download XML:", url);

        const response = await fetch(url, {
          method: "GET",
          headers: { Authorization: authHeader },
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 404) {
            throw new Error("XML não disponível. Manifeste a NF-e (Ciência da Operação) antes de baixar o XML.");
          }
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
          if (response.status === 404) {
            throw new Error("DANFe não disponível. Manifeste a NF-e (Ciência da Operação) antes de baixar o DANFe.");
          }
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
