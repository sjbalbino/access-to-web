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

function isXmlNfeCompleto(xml: string | null | undefined): boolean {
  if (!xml) return false;
  const normalized = xml.replace(/\s+/g, " ").toLowerCase();
  const isResumoDfe = normalized.includes("<resnfe") || normalized.includes(":resnfe");
  const hasNfeProc = normalized.includes("<nfeproc") || normalized.includes(":nfeproc");
  const hasFullNfe =
    (normalized.includes("<nfe") || normalized.includes(":nfe")) &&
    (normalized.includes("<infnfe") || normalized.includes(":infnfe")) &&
    (normalized.includes("<det") || normalized.includes(":det")) &&
    (normalized.includes("<total") || normalized.includes(":total"));

  return !isResumoDfe && (hasNfeProc || hasFullNfe);
}

function getFocusErrorMessage(data: any): string {
  return data?.mensagem || data?.message || data?.erro || data?.error || "Resposta inválida da Focus NFe";
}

async function fetchTextFollowingSignedRedirect(url: string, authHeader: string): Promise<{ ok: boolean; status: number; text: string }> {
  const firstResp = await fetch(url, {
    method: "GET",
    headers: { Authorization: authHeader, Accept: "application/xml, text/xml, application/json;q=0.8" },
    redirect: "manual",
  });

  const location = firstResp.headers.get("Location") || firstResp.headers.get("location");
  if (firstResp.status >= 300 && firstResp.status < 400 && location) {
    const redirectUrl = new URL(location, url).toString();
    console.log("MD-e Download XML redirecionado:", redirectUrl);
    const redirectedResp = await fetch(redirectUrl, { method: "GET" });
    return {
      ok: redirectedResp.ok,
      status: redirectedResp.status,
      text: await redirectedResp.text(),
    };
  }

  return {
    ok: firstResp.ok,
    status: firstResp.status,
    text: await firstResp.text(),
  };
}

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
    .select("api_access_token_principal_producao, api_access_token, api_access_token_homologacao")
    .eq("emitente_id", insc.emitente_id)
    .maybeSingle();

  if (credErr) throw new Error("Erro ao buscar credenciais: " + credErr.message);
  const tokens = [
    ...(emitente.ambiente === 2
      ? [cred?.api_access_token_homologacao, cred?.api_access_token_principal_producao, cred?.api_access_token]
      : [cred?.api_access_token_principal_producao, cred?.api_access_token, cred?.api_access_token_homologacao]),
  ].filter((value, index, arr): value is string => !!value && arr.indexOf(value) === index);
  const token = tokens[0];
  if (!token) {
    throw new Error(`Token ${emitente.ambiente === 2 ? "de homologação" : "principal de produção"} da Focus NFe não configurado para este emitente.`);
  }

  return {
    token,
    tokens,
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

    const { token, tokens, ambiente, doc, docType } = await getInscricaoContext(inscricaoId);
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
        const cleanChave = String(chave).replace(/\D/g, "");
        if (cleanChave.length !== 44) throw new Error("Chave de acesso deve ter 44 dígitos.");

        // Mesmo fluxo validado no app stock-nfe: usar token principal,
        // informar CPF/CNPJ do destinatário e testar as rotas JSON com completa=1.
        // Diferença importante: aqui também testamos os demais tokens cadastrados,
        // pois algumas contas retornam apenas resNFe com um token e o XML completo com outro.
        const parseJson = (value: string) => {
          try { return JSON.parse(value); } catch (_) { return null; }
        };
        const makeUrl = (path: string) => path.startsWith("http")
          ? path
          : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
        const qs = `${docType}=${encodeURIComponent(doc)}&completa=1`;
        const resourceUrls = [
          `${baseUrl}/v2/nfes_recebidas/${cleanChave}?${qs}`,
          `${baseUrl}/v2/nfes_recebidas/${cleanChave}.json?${qs}`,
          `${baseUrl}/v2/nfes_recebidas/${cleanChave}.json?completa=1`,
          `${baseUrl}/v2/nfes_recebidas/${cleanChave}?completa=1`,
        ];

        let info: any = null;
        const xmlUrls: string[] = [];
        const xmlInlineCandidates: string[] = [];
        const attempts: string[] = [];

        const authHeaders = tokens.map((candidate) => `Basic ${btoa(`${candidate}:`)}`);
        let foundCompleteInfo = false;

        for (const [tokenIndex, candidateAuthHeader] of authHeaders.entries()) {
          if (foundCompleteInfo) break;
          for (const urlInfo of resourceUrls) {
            console.log("MD-e Consultar info p/ XML completo:", urlInfo, "token#", tokenIndex + 1);
            const infoResp = await fetch(urlInfo, {
              method: "GET",
              headers: { Authorization: candidateAuthHeader, Accept: "application/json" },
            });
            const infoText = await infoResp.text();
            const candidateInfo = parseJson(infoText) || {};
            attempts.push(`token#${tokenIndex + 1} ${infoResp.status} ${urlInfo} :: ${infoText.slice(0, 180).replace(/\s+/g, " ")}`);

            if (infoResp.ok && candidateInfo?.chave_nfe) {
              info = (!info || candidateInfo?.nfe_completa === true || candidateInfo?.nfe_completa === "true")
                ? candidateInfo
                : info;
              const caminhos = [
                candidateInfo?.caminho_xml_nota_completa,
                candidateInfo?.caminho_xml_completo,
                candidateInfo?.caminho_completo_xml,
                candidateInfo?.xml_nota_completa,
                candidateInfo?.xml_completo,
                candidateInfo?.xml_nfe,
                candidateInfo?.caminho_xml,
                candidateInfo?.caminho_xml_nota_fiscal,
              ].filter(Boolean);

              for (const caminho of caminhos) {
                const value = String(caminho).trim();
                if (!value) continue;
                if (value.startsWith("<")) xmlInlineCandidates.push(value);
                else xmlUrls.push(makeUrl(value));
              }

              if (candidateInfo?.nfe_completa === true || candidateInfo?.nfe_completa === "true") {
                foundCompleteInfo = true;
                break;
              }
            }
          }
        }

        if (!info) {
          throw new Error(`Erro ao consultar dados completos da NF-e: ${attempts.join(" | ")}`);
        }

        console.log("MD-e info completa keys:", Object.keys(info || {}));
        console.log("MD-e info completa status:", JSON.stringify({
          chave: cleanChave,
          situacao: info?.situacao,
          manifestacao_destinatario: info?.manifestacao_destinatario,
          nfe_completa: info?.nfe_completa,
          tem_requisicao: !!info?.requisicao_nota_fiscal,
          itens: Array.isArray(info?.requisicao_nota_fiscal?.itens) ? info.requisicao_nota_fiscal.itens.length : null,
        }));

        xmlUrls.push(
          `${baseUrl}/v2/nfes_recebidas/${cleanChave}.xml?${qs}`,
          `${baseUrl}/v2/nfes_recebidas/${cleanChave}.xml?completa=1`,
          `${baseUrl}/v2/nfes_recebidas/${cleanChave}.xml`,
        );

        let xmlContent: string | null = null;
        let lastXmlError = "";

        for (const xmlCandidate of xmlInlineCandidates) {
          if (isXmlNfeCompleto(xmlCandidate)) {
            xmlContent = xmlCandidate;
            break;
          }
          lastXmlError = "A API retornou XML inline incompleto/resumo.";
        }

        for (const xmlUrl of [...new Set(xmlUrls)]) {
          if (xmlContent) break;
          console.log("MD-e Download XML candidato:", xmlUrl);
          for (const [tokenIndex, candidateAuthHeader] of authHeaders.entries()) {
            const xmlResp = await fetchTextFollowingSignedRedirect(xmlUrl, candidateAuthHeader);
            if (!xmlResp.ok) {
              lastXmlError = `token#${tokenIndex + 1} HTTP ${xmlResp.status}: ${xmlResp.text.slice(0, 500)}`;
              console.log("MD-e falha XML candidato:", lastXmlError);
              continue;
            }
            if (isXmlNfeCompleto(xmlResp.text)) {
              xmlContent = xmlResp.text;
              break;
            }
            lastXmlError = `token#${tokenIndex + 1}: A API retornou XML-resumo (resNFe), não o XML completo da NF-e.`;
            console.log("MD-e XML candidato rejeitado: resumo/incompleto", xmlResp.text.slice(0, 500));
          }
        }

        if (!xmlContent) {
          const situacao = info?.situacao ? ` Situação: ${info.situacao}.` : "";
          const manifestacao = info?.manifestacao_destinatario
            ? ` Manifestação registrada: ${info.manifestacao_destinatario}.`
            : " Manifestação registrada: nenhuma.";
          const completo = typeof info?.nfe_completa === "boolean" ? ` nfe_completa=${info.nfe_completa}.` : "";
          const diagnostico = (
            `Análise do retorno da Focus NFe: a NF-e foi localizada e está ${info?.situacao || "com situação não informada"}. ` +
            `A manifestação consta como ${info?.manifestacao_destinatario || "não registrada"}, porém a própria Focus NFe retornou nfe_completa=${String(info?.nfe_completa ?? false)}. ` +
            `Todas as rotas de download testadas retornaram XML-resumo (tag resNFe) ou resposta sem itens da NF-e. ` +
            `Por segurança, o sistema bloqueou o download para não salvar/importar o resumo como se fosse XML completo.`
          );
          const message = (
            `${diagnostico}\n\nChave: ${cleanChave}.${situacao}${manifestacao}${completo} ` +
            `O download foi bloqueado para não salvar/importar o XML-resumo. ` +
            `Aguarde a distribuição do XML completo pela SEFAZ/Focus NFe e tente novamente. ${lastXmlError}`
          ).trim();

          return new Response(
            JSON.stringify({
              success: false,
              fallback: true,
              nfe_key: cleanChave,
              error: message,
              diagnostico,
              nfe_completa: info?.nfe_completa ?? false,
              manifestacao_destinatario: info?.manifestacao_destinatario ?? null,
              situacao: info?.situacao ?? null,
              retorno_focus: {
                nfe_completa: info?.nfe_completa ?? false,
                manifestacao_destinatario: info?.manifestacao_destinatario ?? null,
                situacao: info?.situacao ?? null,
                xml_resumo_detectado: lastXmlError.toLowerCase().includes("xml-resumo") || lastXmlError.toLowerCase().includes("resumo"),
              },
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
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
