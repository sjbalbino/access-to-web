// Baixa DANFE (PDF) e XML autorizado da NF-e via Unimake (UniNFe Cloud).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertNotaFiscalTenant, getCallerTenant, tenantErrorResponse } from "../_shared/tenant-guard.ts";
import {
  autenticarUnimake, carregarContextoNota, corsUnimake, jsonResp, obterTokenUnimake, tpAmbUnimake,
  unimakeBaseUrl, unimakeErroTexto,
} from "../_shared/unimake-api.ts";

const TIPOS = ["xml", "danfe", "xml_cancelamento", "cce_pdf", "cce_xml"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsUnimake });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const auth = await autenticarUnimake(req, admin, createClient, false);
    if (auth instanceof Response) return auth;

    const { notaFiscalId, tipo } = await req.json();
    if (!notaFiscalId) return jsonResp({ success: false, error: "notaFiscalId é obrigatório" }, 400);
    if (!TIPOS.includes(tipo)) return jsonResp({ success: false, error: "tipo inválido" }, 400);
    const caller = await getCallerTenant(admin, auth.userId);
    const guard = await assertNotaFiscalTenant(admin, notaFiscalId, caller);
    if (!guard.ok) return tenantErrorResponse(guard, corsUnimake);

    const ctx = await carregarContextoNota(admin, notaFiscalId);
    if (!ctx.chave) return jsonResp({ success: false, error: "A nota não possui chave de acesso." }, 400);

    const token = await obterTokenUnimake(ctx.cred);
    const base = `${unimakeBaseUrl(ctx.cred.ambiente)}/api/v1/${ctx.docEmitente}/NFe`;

    if (tipo === "danfe") {
      const pdfResp = (buf: Uint8Array) => new Response(buf, {
        headers: { ...corsUnimake, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="danfe_${ctx.chave}.pdf"` },
      });
      // Extrai PDF da resposta: binário (%PDF) ou base64 (puro, JSON ou XML).
      const extrairPdf = async (r: Response): Promise<Uint8Array | null> => {
        const buf = new Uint8Array(await r.arrayBuffer());
        if (buf.length > 4 && String.fromCharCode(...buf.slice(0, 4)) === "%PDF") return buf;
        const txt = new TextDecoder().decode(buf);
        const m = txt.match(/JVBERi0[A-Za-z0-9+/=\r\n]+/);
        if (!m) return null;
        try {
          const bin = atob(m[0].replace(/[\r\n]/g, ""));
          return Uint8Array.from(bin, (c) => c.charCodeAt(0));
        } catch { return null; }
      };

      // 1) PDF já armazenado na Unimake
      const resp = await fetch(`${base}/DANFE/${ctx.chave}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/pdf" },
      });
      if (resp.ok) {
        const pdf = await extrairPdf(resp);
        if (pdf) return pdfResp(pdf);
      } else {
        await resp.text();
      }

      // 2) Não armazenado: obtém o procNFe pela consulta e pede para gerar o DANFE.
      const cons = await fetch(`${base}/Consultar/${ctx.chave}?tpAmb=${tpAmbUnimake(ctx.cred.ambiente)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/xml" },
      });
      const procXml = await cons.text();
      if (!cons.ok || !/<nfeProc[\s>]/i.test(procXml)) {
        throw new Error(`DANFE não disponível na Unimake: não foi possível obter o XML autorizado da nota (${unimakeErroTexto(procXml, cons.status)}).`);
      }
      const ger = await fetch(`${base}/DANFE/${ctx.chave}?regerar=true`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/xml", Accept: "application/pdf" },
        body: procXml.replace(/^\uFEFF/, ""),
      });
      if (!ger.ok) {
        const t = await ger.text();
        throw new Error(`A Unimake não conseguiu gerar o DANFE: ${unimakeErroTexto(t, ger.status)}`);
      }
      const pdf = await extrairPdf(ger);
      if (!pdf) throw new Error("A Unimake respondeu, mas não devolveu um PDF de DANFE válido.");
      return pdfResp(pdf);
    }

    // XML: a consulta da Unimake devolve o XML de protocolo/distribuição da nota
    const resp = await fetch(`${base}/Consultar/${ctx.chave}?tpAmb=${tpAmbUnimake(ctx.cred.ambiente)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/xml" },
    });
    const texto = await resp.text();
    if (!resp.ok) throw new Error(`XML não disponível na Unimake: ${unimakeErroTexto(texto, resp.status)}`);

    // Eventos (cancelamento / CC-e) vêm como procEventoNFe dentro da consulta de situação.
    if (tipo !== "xml") {
      const tpEvento = tipo === "xml_cancelamento" ? "110111" : "110110";
      const eventos = [...texto.matchAll(/<(?:\w+:)?procEventoNFe[\s\S]*?<\/(?:\w+:)?procEventoNFe>/gi)]
        .map((m) => m[0])
        .filter((x) => new RegExp(`<(?:\\w+:)?tpEvento>${tpEvento}<`).test(x));
      const evento = eventos[eventos.length - 1]; // último evento (CC-e mais recente)
      if (!evento) {
        const nome = tipo === "xml_cancelamento" ? "cancelamento" : "carta de correção";
        return jsonResp({ success: false, error: `A SEFAZ ainda não retornou o evento de ${nome} desta nota.` }, 404);
      }
      const xmlEvento = `<?xml version="1.0" encoding="UTF-8"?>${evento}`;
      if (tipo !== "cce_pdf") {
        return new Response(xmlEvento, {
          headers: { ...corsUnimake, "Content-Type": "application/xml", "Content-Disposition": `attachment; filename="${tipo}_${ctx.chave}.xml"` },
        });
      }
      const pdf = await gerarPdfCce(evento, ctx.chave);
      return new Response(pdf, {
        headers: { ...corsUnimake, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="cce_${ctx.chave}.pdf"` },
      });
    }
    return new Response(texto, {
      headers: { ...corsUnimake, "Content-Type": "application/xml", "Content-Disposition": `attachment; filename="nfe_${ctx.chave}.xml"` },
    });
  } catch (error) {
    console.error("Erro ao baixar arquivo via Unimake:", error);
    return jsonResp({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }, 500);
  }
});

/** Gera um PDF simples da Carta de Correção a partir do procEventoNFe. */
async function gerarPdfCce(evento: string, chave: string): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts } = await import("https://esm.sh/pdf-lib@1.17.1");
  const tag = (n: string) => evento.match(new RegExp(`<(?:\\w+:)?${n}>([^<]*)<`, "i"))?.[1] ?? "";
  const dec = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]);
  let y = 800;
  // deno-lint-ignore no-explicit-any
  const linha = (t: string, f: any = font, size = 10) => {
    const limpo = t.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "");
    let atual = "";
    for (const p of limpo.split(" ")) {
      const teste = atual ? `${atual} ${p}` : p;
      if (f.widthOfTextAtSize(teste, size) > 515) { page.drawText(atual, { x: 40, y, size, font: f }); y -= size + 4; atual = p; }
      else atual = teste;
    }
    page.drawText(atual, { x: 40, y, size, font: f }); y -= size + 6;
  };
  linha("CARTA DE CORREÇÃO ELETRÔNICA (CC-e)", bold, 14);
  y -= 6;
  linha(`Chave de acesso: ${chave}`);
  linha(`Sequência do evento: ${tag("nSeqEvento")}`);
  linha(`Data do evento: ${tag("dhEvento")}`);
  linha(`Protocolo: ${tag("nProt")}   Situação: ${tag("cStat")} - ${dec(tag("xMotivo"))}`);
  y -= 8;
  linha("Correção:", bold, 11);
  linha(dec(tag("xCorrecao")));
  y -= 8;
  linha("Condições de uso:", bold, 11);
  linha(dec(tag("xCondUso")), font, 8);
  return await doc.save();
}
