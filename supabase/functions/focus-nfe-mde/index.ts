import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertInscricaoTenant, getCallerTenant, tenantErrorResponse } from "../_shared/tenant-guard.ts";

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

function friendlyKeyLookupError(
  rawMsg: string,
  chave: string,
  doc: string,
  docType: string,
  ambiente: number | null | undefined,
): string {
  const ambienteLabel = ambiente === 2 ? "homologação" : "produção";
  const docLabel = `${docType.toUpperCase()} ${doc}`;
  const lower = (rawMsg || "").toLowerCase();

  if (!rawMsg || lower.includes("não encontrad") || lower.includes("not found") || lower.includes("nao encontrad")) {
    return `Não encontramos esta NF-e na sua caixa de documentos recebidos.\n\n` +
      `Chave: ${chave}\nEmitente consultado: ${docLabel} (${ambienteLabel})\n\n` +
      `Possíveis causas:\n` +
      `• O destinatário da nota não é este emitente (confira o CNPJ/CPF).\n` +
      `• A SEFAZ ainda não distribuiu o evento (geralmente leva alguns minutos).\n` +
      `• O ambiente está incorreto (produção × homologação).`;
  }
  if (lower.includes("token") || lower.includes("autoriza") || lower.includes("unauthor")) {
    return "Token da Focus NFe inválido ou sem permissão para consultar este documento.";
  }
  if (lower.includes("timeout") || lower.includes("indispon")) {
    return "A SEFAZ está temporariamente indisponível. Tente novamente em alguns minutos.";
  }
  if (lower.includes("chave")) {
    return `Chave de acesso inválida ou rejeitada pela SEFAZ.\nChave informada: ${chave}`;
  }
  return `Não foi possível consultar a NF-e na SEFAZ.\n${rawMsg}`;
}

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

    // Tenant isolation
    {
      const adminCli = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const caller = await getCallerTenant(adminCli, _userData.user.id);
      const guard = await assertInscricaoTenant(adminCli, inscricaoId, caller);
      if (!guard.ok) return tenantErrorResponse(guard, corsHeaders);
    }

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

      case "consultar_chave": {
        if (!chave) throw new Error("chave é obrigatória");
        const cleanChave = String(chave).replace(/\D/g, "");
        if (cleanChave.length !== 44) throw new Error("Chave de acesso deve ter 44 dígitos.");

        // 1) Tenta endpoint direto
        const urlDireto = `${baseUrl}/v2/nfes_recebidas/${cleanChave}`;
        console.log("MD-e Consultar por chave (direto):", urlDireto);
        let response = await fetch(urlDireto, {
          method: "GET",
          headers: { Authorization: authHeader },
        });
        let data: any = await response.json().catch(() => ({}));

        // 2) Se não encontrou, tenta via listagem MD-e e filtra por chave (Focus ignora o filtro `chave` na URL)
        if (!response.ok || !data || (Array.isArray(data) && data.length === 0)) {
          const urlListagem = `${baseUrl}/v2/nfes_recebidas?${docType}=${doc}&chave=${cleanChave}&versao=1`;
          console.log("MD-e Consultar por chave (listagem):", urlListagem);
          const respList = await fetch(urlListagem, {
            method: "GET",
            headers: { Authorization: authHeader },
          });
          const listData = await respList.json().catch(() => null);
          if (respList.ok && Array.isArray(listData)) {
            const match = listData.filter((it: any) => {
              const k = String(it?.chave ?? it?.chave_nfe ?? "").replace(/\D/g, "");
              return k === cleanChave;
            });
            if (match.length > 0) {
              result = match;
              break;
            }
          }
          // Não encontrada: retorna lista vazia + aviso (sem 500)
          const rawMsg = data?.mensagem || data?.message || listData?.mensagem || listData?.message || "";
          const aviso = friendlyKeyLookupError(rawMsg, cleanChave, doc, docType, ambiente);
          return new Response(
            JSON.stringify({ success: true, data: [], warning: aviso }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        result = Array.isArray(data) ? data : [data];
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

        // Focus NFe: o endpoint .xml retorna apenas o RESUMO (nfeProc não completo).
        // O XML completo (procNFe com todos os itens) só fica disponível após a
        // Confirmação da Operação e deve ser baixado pelo caminho informado no
        // JSON da consulta (campo caminho_xml_nota_fiscal / caminho_xml_completo).
        const urlInfo = `${baseUrl}/v2/nfes_recebidas/${chave}`;
        console.log("MD-e Consultar info p/ XML completo:", urlInfo);
        const infoResp = await fetch(urlInfo, {
          method: "GET",
          headers: { Authorization: authHeader },
        });
        const info: any = await infoResp.json().catch(() => ({}));

        const caminhoCompleto: string | undefined =
          info?.caminho_xml_nota_fiscal ||
          info?.caminho_xml_completo ||
          info?.caminho_completo_xml ||
          info?.xml_nfe ||
          info?.caminho_xml;

        let xmlContent: string | null = null;

        if (caminhoCompleto) {
          const xmlUrl = caminhoCompleto.startsWith("http")
            ? caminhoCompleto
            : `${baseUrl}${caminhoCompleto.startsWith("/") ? "" : "/"}${caminhoCompleto}`;
          console.log("MD-e Download XML completo (caminho):", xmlUrl);
          const xmlResp = await fetch(xmlUrl, {
            method: "GET",
            headers: { Authorization: authHeader },
            redirect: "follow",
          });
          if (xmlResp.ok) {
            xmlContent = await xmlResp.text();
          } else {
            const errTxt = await xmlResp.text();
            console.log("Falha no caminho completo:", xmlResp.status, errTxt);
          }
        }

        // Fallback: tenta o .xml direto (retorna resumo se não tiver completo)
        if (!xmlContent) {
          const urlFallback = `${baseUrl}/v2/nfes_recebidas/${chave}.xml`;
          console.log("MD-e Download XML (fallback .xml):", urlFallback);
          const response = await fetch(urlFallback, {
            method: "GET",
            headers: { Authorization: authHeader },
          });
          if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 404) {
              throw new Error("XML não disponível. Confirme a Operação (manifestação 'Confirmação') para liberar o XML completo na SEFAZ.");
            }
            throw new Error(`Erro ao baixar XML: ${response.status} - ${errorText}`);
          }
          xmlContent = await response.text();
        }

        return new Response(JSON.stringify({ success: true, xml: xmlContent }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }


      case "download_danfe": {
        if (!chave) throw new Error("chave é obrigatória para download");

        const url = `${baseUrl}/v2/nfes_recebidas/${chave}.pdf?wait=1`;
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
