// Consulta status de NF-e na ACBr API Nuvem e atualiza a nota no banco.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertNotaFiscalTenant, getCallerTenant, tenantErrorResponse } from "../_shared/tenant-guard.ts";
import { montarErrosApi, normalizarErrosFocus, resumirErros } from "../_shared/nfe-erros.ts";
import { extrairDatasNfe, extrairDatasDoXml } from "../_shared/nfe-datas.ts";
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

    const { ref, notaFiscalId } = await req.json();

    if (!ref) {
      throw new Error("ref é obrigatório");
    }

    // Tenant isolation
    if (notaFiscalId) {
      const adminCli = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      const caller = await getCallerTenant(adminCli, _userData.user.id);
      const guard = await assertNotaFiscalTenant(adminCli, notaFiscalId, caller);
      if (!guard.ok) return tenantErrorResponse(guard, corsHeaders);
    }

    console.log("Consultando NF-e na ACBr API:", ref);

    // deno-lint-ignore no-explicit-any
    let supabase: any = null;
    let emitenteId: string | null = null;

    if (notaFiscalId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: notaData } = await supabase
        .from("notas_fiscais")
        .select("emitente_id")
        .eq("id", notaFiscalId)
        .maybeSingle();

      if (!notaData) {
        return new Response(
          JSON.stringify({ success: false, error: "Nota fiscal não encontrada no banco de dados" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      emitenteId = notaData.emitente_id;
    }

    if (!emitenteId) {
      return new Response(
        JSON.stringify({ success: false, error: "Nota fiscal sem emitente vinculado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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

    const response = await acbrFetch(cred, `/nfe/${ref}`);
    const responseData = await response.json();
    console.log("Resposta ACBr API:", JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData?.error?.message || responseData?.message || `ACBr API retornou HTTP ${response.status}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Normaliza o formato ACBr para os campos esperados pela tela (padrão Focus)
    const aut = responseData?.autorizacao || {};
    if (!responseData.chave_nfe && (responseData.chave || aut.chave_acesso)) {
      responseData.chave_nfe = responseData.chave || aut.chave_acesso;
    }
    if (!responseData.protocolo && aut.numero_protocolo) responseData.protocolo = aut.numero_protocolo;
    if (!responseData.mensagem_sefaz && aut.motivo_status) responseData.mensagem_sefaz = aut.motivo_status;
    if (!responseData.status_sefaz && aut.codigo_status) responseData.status_sefaz = String(aut.codigo_status);
    if (responseData.status === "autorizado") responseData.status = "autorizada";
    if (responseData.status === "rejeitado") responseData.status = "rejeitada";
    if (responseData.status === "cancelado") responseData.status = "cancelada";

    // Quando autorizada, buscar dhEmi/dhRecbto no XML autorizado (fonte oficial)
    let datasDoXml: { data_emissao?: string; data_autorizacao?: string } = {};
    const caminhoXml = responseData?.caminho_xml_nota_fiscal as string | undefined;
    if (caminhoXml) {
      try {
        const token = await obterTokenAcbr(cred);
        const xmlUrl = caminhoXml.startsWith("http") ? caminhoXml : `${acbrBaseUrl(cred.ambiente)}${caminhoXml}`;
        const xmlResp = await fetch(xmlUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (xmlResp.ok) {
          datasDoXml = extrairDatasDoXml(await xmlResp.text());
          console.log("Datas extraídas do XML autorizado:", JSON.stringify(datasDoXml));
        } else {
          console.warn("Não foi possível baixar o XML para ler as datas:", xmlResp.status);
        }
      } catch (e) {
        console.warn("Erro ao ler datas do XML:", e);
      }
    }

    // Atualizar no banco
    if (notaFiscalId && supabase) {
      const updateData: Record<string, unknown> = {
        status: responseData.status,
      };

      if (responseData.chave_nfe) updateData.chave_acesso = responseData.chave_nfe;
      if (responseData.numero) updateData.numero = responseData.numero;
      if (responseData.serie) updateData.serie = responseData.serie;
      if (responseData.protocolo) updateData.protocolo = responseData.protocolo;
      if (responseData.caminho_xml_nota_fiscal) updateData.xml_url = responseData.caminho_xml_nota_fiscal;
      if (responseData.caminho_danfe) updateData.danfe_url = responseData.caminho_danfe;
      const errosDetalhados = normalizarErrosFocus(responseData);
      if (responseData.mensagem_sefaz || errosDetalhados.length > 0) {
        updateData.motivo_status = resumirErros(
          responseData.mensagem_sefaz || responseData.mensagem,
          errosDetalhados,
        ).substring(0, 1000);
      }
      updateData.erros_api = montarErrosApi(responseData);

      const datasOficiais = { ...extrairDatasNfe(responseData), ...datasDoXml };
      if (datasOficiais.data_emissao) updateData.data_emissao = datasOficiais.data_emissao;
      if (datasOficiais.data_autorizacao) updateData.data_autorizacao = datasOficiais.data_autorizacao;
      console.log("Datas oficiais gravadas:", JSON.stringify(datasOficiais));

      const { error: updateError } = await supabase
        .from("notas_fiscais")
        .update(updateData)
        .eq("id", notaFiscalId);

      if (updateError) {
        console.error("Erro ao atualizar nota fiscal no banco:", updateError);
      } else {
        console.log("Nota fiscal atualizada com sucesso no banco de dados");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
        erros: normalizarErrosFocus(responseData),
        errosApi: montarErrosApi(responseData),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Erro ao consultar NF-e na ACBr API:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
