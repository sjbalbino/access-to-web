// DF-e (NF-es recebidas) e Manifestação do Destinatário via Unimake (UniNFe Cloud).
// Mesmo contrato de entrada/saída das funções focus-nfe-mde e acbr-api-dfe, para que
// a tela de NF-es Recebidas funcione igual com qualquer provedor fiscal.
// Distribuição: POST /api/v1/{CPFCNPJ}/NFe/Distribuicao (XML distDFeInt → retDistDFeInt,
// com loteDistDFeInt/docZip em Base64+GZIP). Manifestação: NFe/RecepcaoEvento (envEvento).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pako from "npm:pako@2.1.0";
import { assertInscricaoTenant, getCallerTenant, tenantErrorResponse } from "../_shared/tenant-guard.ts";
import {
  autenticarUnimake, buscarCredenciaisUnimake, corsUnimake, jsonResp, obterTokenUnimake, tpAmbUnimake,
  unimakeBaseUrl, unimakeErroTexto, unimakeXmlPost,
} from "../_shared/unimake-api.ts";
import { campoResposta, montarDistDFeInt, montarEventoManifestacao, UF_CODIGO } from "../_shared/unimake-xml.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TIPO_EVENTO: Record<string, string> = {
  confirmacao: "210200",
  ciencia: "210210",
  desconhecimento: "210220",
  nao_realizada: "210240",
};
const EVENTO_TIPO: Record<string, string> = Object.fromEntries(
  Object.entries(TIPO_EVENTO).map(([k, v]) => [v, k]),
);

interface NfeItem {
  chave: string;
  nome: string;
  cnpj: string;
  valor: number;
  data_emissao: string;
  situacao: string;
  tipo_nfe: string;
  numero: string;
  serie: string;
  manifestacao_destinatario?: string;
  nfe_completa?: boolean;
}

/** Valor da última ocorrência de uma tag (sem namespace) no XML. */
function tagUltimo(xml: string, tag: string): string {
  let out = "";
  for (const m of xml.matchAll(new RegExp(`<(?:\\w+:)?${tag}[^>]*>([^<]*)</(?:\\w+:)?${tag}>`, "i"))) {
    out = (m[1] ?? "").trim();
  }
  return out;
}

const b64ParaBytes = (b64: string): Uint8Array => {
  const bin = atob(b64.trim());
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

/** docZip da SEFAZ: Base64 de um XML comprimido em GZIP. */
const descomprimir = (b64: string): string => {
  try {
    return pako.ungzip(b64ParaBytes(b64), { to: "string" }) as unknown as string;
  } catch {
    return "";
  }
};

const attrsDocZip = (s: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(/(\w+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
};

/** Converte um docZip descomprimido (resNFe ou procNFe) no item exibido na tela. */
function deResumoOuCompleta(xml: string, completa: boolean): NfeItem | null {
  const chave = completa
    ? (xml.match(/(?:\w+:)?infNFe[^>]*Id="NFe(\d{44})"/i)?.[1] ?? tagUltimo(xml, "chNFe"))
    : tagUltimo(xml, "chNFe");
  if (!/^\d{44}$/.test(chave)) return null;
  // Em procNFe o CNPJ/xNome do TOPO são do destinatário; pega sempre do bloco <emit>.
  const emit = completa ? (xml.match(/<(?:\w+:)?emit[^>]*>([\s\S]*?)<\/(?:\w+:)?emit>/i)?.[1] ?? "") : "";
  const base = emit || xml;
  const doc = tagUltimo(base, "CNPJ") || tagUltimo(base, "CPF");
  const nome = tagUltimo(base, "xNome");
  const valor = Number(tagUltimo(xml, "vNF") || "0") || 0;
  const dataEmissao = tagUltimo(xml, "dhEmi") || tagUltimo(xml, "dEmi") || "";
  const cStat = tagUltimo(xml, "cSitNFe") || tagUltimo(xml, "cStat");
  let situacao = "";
  if (completa) {
    if (["100", "150"].includes(cStat)) situacao = "autorizada";
    else if (["110", "301", "302", "303"].includes(cStat)) situacao = "denegada";
    else if (cStat) situacao = "rejeitada";
  } else if (cStat === "1") situacao = "autorizada";
  else if (cStat === "2") situacao = "denegada";
  else if (cStat === "3") situacao = "cancelada";
  return {
    chave,
    nome,
    cnpj: doc,
    valor,
    data_emissao: dataEmissao,
    situacao,
    tipo_nfe: tagUltimo(xml, "tpNF"),
    numero: String(parseInt(chave.slice(25, 34), 10)),
    serie: String(parseInt(chave.slice(22, 25), 10)),
    nfe_completa: completa,
  };
}

/** Processa os docZip do retDistDFeInt: notas (resumo/completa) e eventos de manifestação. */
function processarDocZips(texto: string): { lista: NfeItem[]; xmls: Map<string, string> } {
  const porChave = new Map<string, NfeItem>();
  const xmls = new Map<string, string>();
  for (const m of texto.matchAll(/<docZip([^>]*)>([^<]*)<\/docZip>/gi)) {
    const at = attrsDocZip(m[1]);
    const xml = descomprimir(m[2]);
    if (!xml) continue;
    const schema = (at.schema ?? "").toLowerCase();
    if (/evento/.test(schema)) {
      const chave = tagUltimo(xml, "chNFe");
      const tipo = EVENTO_TIPO[tagUltimo(xml, "tpEvento")];
      if (chave && tipo) {
        const item = porChave.get(chave);
        if (item) item.manifestacao_destinatario = tipo;
      }
      continue;
    }
    const completa = /procnfe/.test(schema);
    const item = deResumoOuCompleta(xml, completa);
    if (!item) continue;
    const ant = porChave.get(item.chave);
    // Prioriza o registro mais completo, preservando a manifestação já vista.
    if (!ant || (!ant.nfe_completa && item.nfe_completa)) {
      item.manifestacao_destinatario = item.manifestacao_destinatario ?? ant?.manifestacao_destinatario;
      porChave.set(item.chave, item);
    }
    if (completa) xmls.set(item.chave, xml);
  }
  const lista = Array.from(porChave.values()).sort((a, b) =>
    (b.data_emissao || "").localeCompare(a.data_emissao || ""),
  );
  return { lista, xmls };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsUnimake });
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  try {
    const auth = await autenticarUnimake(req, admin, createClient);
    if (auth instanceof Response) return auth;

    const body = await req.json().catch(() => ({}));
    const { action, inscricaoId, chave, tipo, justificativa } = body ?? {};
    if (typeof inscricaoId !== "string" || !inscricaoId) {
      return jsonResp({ success: false, error: "inscricaoId é obrigatório" }, 400);
    }
    if (typeof action !== "string") return jsonResp({ success: false, error: "action é obrigatório" }, 400);

    const caller = await getCallerTenant(admin, auth.userId);
    const guard = await assertInscricaoTenant(admin, inscricaoId, caller);
    if (!guard.ok) return tenantErrorResponse(guard, corsUnimake);

    const { data: insc } = await admin.from("inscricoes_produtor")
      .select("cpf_cnpj, uf, emitente_id").eq("id", inscricaoId).maybeSingle();
    if (!insc?.emitente_id) return jsonResp({ success: false, error: "Inscrição sem emitente NF-e configurado." }, 400);
    const doc = String(insc.cpf_cnpj ?? "").replace(/\D/g, "");
    if (doc.length !== 11 && doc.length !== 14) return jsonResp({ success: false, error: "CPF/CNPJ inválido na inscrição." }, 400);

    const cred = await buscarCredenciaisUnimake(admin, insc.emitente_id);
    if (!cred) return jsonResp({ success: false, error: "App ID / Secret da Unimake não configurados para este emitente." }, 400);
    const tpAmb = tpAmbUnimake(cred.ambiente);
    // cUFAutor: UF do autor da consulta (destinatário). Sem UF cadastrada, assume RS.
    const cUfAutor = UF_CODIGO[String(insc.uf ?? "").toUpperCase()] ?? 43;
    const cleanChave = typeof chave === "string" ? chave.replace(/\D/g, "") : "";

    switch (action) {
      case "consultar": {
        // Um lote por consulta (distNSU): o frontend guarda o último NSU devolvido
        // pela SEFAZ e o envia na próxima sincronização.
        const ultNsu = Number((body as Record<string, unknown>).ultNsu ?? 0) || 0;
        const xmlPed = montarDistDFeInt({ doc, tpAmb, cUfAutor, tipo: "dist_nsu", ultNsu });
        const r = await unimakeXmlPost(cred, `/api/v1/${doc}/NFe/Distribuicao`, xmlPed);
        console.log("Unimake distribuicao HTTP", r.status, r.texto.slice(0, 1500));
        if (!r.ok) return jsonResp({ success: false, error: unimakeErroTexto(r.texto, r.status) }, 400);
        const cStat = campoResposta(r.texto, "cStat");
        const xMotivo = campoResposta(r.texto, "xMotivo");
        const ultNovo = Number(campoResposta(r.texto, "ultNSU") ?? ultNsu) || ultNsu;
        const maxNsu = Number(campoResposta(r.texto, "maxNSU") ?? ultNovo) || ultNovo;
        if (cStat && !["137", "138"].includes(cStat)) {
          return jsonResp({
            success: true,
            data: [],
            warning: `SEFAZ: ${cStat} - ${xMotivo ?? ""}`.trim(),
            ult_nsu: ultNovo,
            max_nsu: maxNsu,
          });
        }
        const { lista } = processarDocZips(r.texto);
        let warning: string | undefined;
        if (cStat === "137") warning = "Nenhuma nova NF-e destinada encontrada desde a última sincronização.";
        else if (maxNsu > ultNovo) {
          warning = `Lote processado. Ainda há cerca de ${maxNsu - ultNovo} documento(s) na fila da SEFAZ. ` +
            "Clique em Sincronizar novamente após alguns minutos para buscar o próximo lote.";
        }
        return jsonResp({ success: true, data: lista, warning, ult_nsu: ultNovo, max_nsu: maxNsu });
      }

      case "consultar_chave": {
        if (cleanChave.length !== 44) return jsonResp({ success: false, error: "Chave deve ter 44 dígitos." }, 400);
        const xmlPed = montarDistDFeInt({ doc, tpAmb, cUfAutor, tipo: "chave", chave: cleanChave });
        const r = await unimakeXmlPost(cred, `/api/v1/${doc}/NFe/Distribuicao`, xmlPed);
        console.log("Unimake distribuicao por chave HTTP", r.status, r.texto.slice(0, 1500));
        if (!r.ok) return jsonResp({ success: false, error: unimakeErroTexto(r.texto, r.status) }, 400);
        const cStat = campoResposta(r.texto, "cStat");
        const { lista } = processarDocZips(r.texto);
        const aviso = !lista.length
          ? (cStat && cStat !== "138"
            ? `SEFAZ: ${cStat} - ${campoResposta(r.texto, "xMotivo") ?? ""}`.trim()
            : "NF-e não localizada na distribuição da SEFAZ. Confira o CNPJ/CPF do destinatário; a SEFAZ pode levar alguns minutos para distribuir a NF-e.")
          : undefined;
        return jsonResp({ success: true, data: lista, warning: aviso });
      }

      case "manifestar": {
        if (cleanChave.length !== 44) return jsonResp({ success: false, error: "Chave inválida." }, 400);
        const tipoEvento = TIPO_EVENTO[String(tipo)];
        if (!tipoEvento) return jsonResp({ success: false, error: "Tipo de manifestação inválido." }, 400);
        const just = typeof justificativa === "string" && justificativa.trim().length >= 15
          ? justificativa.trim()
          : "Manifestacao registrada pelo destinatario via Sisagro";
        const xml = montarEventoManifestacao({
          tipoEvento, chave: cleanChave, doc, tpAmb, justificativa: just,
        });
        const r = await unimakeXmlPost(cred, `/api/v1/${doc}/NFe/RecepcaoEvento`, xml);
        console.log("Unimake manifestacao HTTP", r.status, r.texto.slice(0, 1500));
        const cStat = campoResposta(r.texto, "cStat");
        const xMotivo = campoResposta(r.texto, "xMotivo");
        // 135 = evento homologado com vinculação; 136 = homologado sem vinculação.
        if (!r.ok || !["135", "136"].includes(cStat)) {
          const msg = cStat
            ? `SEFAZ rejeitou a manifestação: ${cStat} - ${xMotivo ?? ""}`.trim()
            : unimakeErroTexto(r.texto, r.status);
          return jsonResp({ success: false, error: msg }, 400);
        }
        return jsonResp({ success: true, data: { status: "registrado", codigo_status: cStat, mensagem_sefaz: xMotivo } });
      }

      case "download_xml": {
        if (cleanChave.length !== 44) return jsonResp({ success: false, error: "Chave inválida." }, 400);
        const xmlPed = montarDistDFeInt({ doc, tpAmb, cUfAutor, tipo: "chave", chave: cleanChave });
        const r = await unimakeXmlPost(cred, `/api/v1/${doc}/NFe/Distribuicao`, xmlPed);
        if (!r.ok) return jsonResp({ success: false, error: unimakeErroTexto(r.texto, r.status) }, 400);
        const { xmls } = processarDocZips(r.texto);
        const xml = xmls.get(cleanChave);
        if (!xml) {
          return jsonResp({
            success: false,
            error: "O XML completo ainda não foi liberado pela SEFAZ. Manifeste a Ciência da Operação e tente novamente em alguns minutos.",
            nfe_completa: false,
          }, 400);
        }
        return jsonResp({ success: true, xml });
      }

      case "download_danfe": {
        if (cleanChave.length !== 44) return jsonResp({ success: false, error: "Chave inválida." }, 400);
        const token = await obterTokenUnimake(cred);
        const resp = await fetch(`${unimakeBaseUrl(cred.ambiente)}/api/v1/${doc}/NFe/DANFE/${cleanChave}?tpAmb=${tpAmb}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/pdf" },
        });
        if (!resp.ok) {
          const t = await resp.text();
          return jsonResp({ success: false, error: `Falha ao gerar DANFE na Unimake: ${unimakeErroTexto(t, resp.status)}` }, 400);
        }
        return new Response(await resp.arrayBuffer(), {
          headers: { ...corsUnimake, "Content-Type": "application/pdf" },
        });
      }

      default:
        return jsonResp({ success: false, error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (error) {
    console.error("unimake-api-dfe:", error);
    return jsonResp({ success: false, error: (error as Error).message || "Erro na Unimake" }, 500);
  }
});
