import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { notaFiscalId, notaData } = await req.json();

    if (!notaFiscalId || !notaData) {
      throw new Error("notaFiscalId e notaData são obrigatórios");
    }

    // Inicializar cliente Supabase
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Buscar nota fiscal com dados do emitente para determinar o ambiente e token
    const { data: existingNota } = await supabase
      .from("notas_fiscais")
      .select(`
        uuid_api, 
        status, 
        motivo_status,
        emitente_id,
        emitentes_nfe!notas_fiscais_emitente_id_fkey(ambiente, api_access_token)
      `)
      .eq("id", notaFiscalId)
      .maybeSingle();

    // Verificar se a nota existe
    if (!existingNota) {
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

    // Obter ambiente e token do emitente
    const emitenteData = (existingNota as unknown as { emitentes_nfe?: { ambiente: number | null; api_access_token: string | null } })?.emitentes_nfe;
    const ambiente = emitenteData?.ambiente;
    const emitenteToken = emitenteData?.api_access_token;

    // Verificar se o token do emitente está configurado
    if (!emitenteToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token da Focus NFe não configurado para este emitente. Configure o token no cadastro do emitente.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Se já existe uma nota autorizada, não permitir nova emissão
    if (existingNota?.status === "autorizada") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Esta nota já foi autorizada anteriormente",
          details: { status: existingNota.status },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Gerar referência única para a nota incluindo timestamp
    const timestamp = Date.now();
    
    // Se status anterior é erro ou rejeitada, gerar NOVA referência para evitar duplicidade
    const shouldGenerateNewRef = !existingNota?.uuid_api || 
      existingNota.status === "erro_autorizacao" || 
      existingNota.status === "rejeitada" ||
      existingNota.status === "rejeitado";

    const ref = shouldGenerateNewRef 
      ? `nfe_${notaFiscalId}_${timestamp}` 
      : existingNota.uuid_api;

    console.log("Emitindo NF-e:", notaFiscalId);
    console.log("Referência:", ref);
    console.log("Dados:", JSON.stringify(notaData, null, 2));

    // Chamar API Focus NFe usando o ambiente do emitente
    const baseUrl = getBaseUrl(ambiente);
    console.log("URL Base:", baseUrl);
    
    const response = await fetch(`${baseUrl}/v2/nfe?ref=${ref}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${emitenteToken}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notaData),
    });

    // Verificar se a resposta é JSON válido
    const responseText = await response.text();
    console.log("Resposta bruta Focus NFe:", responseText);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      // Resposta não é JSON válido - provavelmente erro de autenticação
      console.error("Resposta não é JSON válido:", responseText);
      
      await supabase
        .from("notas_fiscais")
        .update({
          status: "rejeitada",
          motivo_status: `Erro de comunicação com Focus NFe: ${responseText.substring(0, 200)}`,
        })
        .eq("id", notaFiscalId);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Erro de autenticação ou comunicação com Focus NFe. Verifique se o token está correto para o ambiente selecionado.",
          details: responseText.substring(0, 500),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log("Resposta Focus NFe:", JSON.stringify(responseData, null, 2));

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

    const { error: updateError } = await supabase
      .from("notas_fiscais")
      .update(updateData)
      .eq("id", notaFiscalId);

    if (updateError) {
      console.error("Erro ao atualizar nota fiscal no banco:", updateError);
      return new Response(
        JSON.stringify({
          success: true,
          warning: "NF-e processada pela SEFAZ, mas houve erro ao atualizar o banco de dados local",
          data: responseData,
          ref,
          updateError: updateError.message,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Nota fiscal atualizada com sucesso no banco de dados");

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
