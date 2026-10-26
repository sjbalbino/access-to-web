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
    if (tipo !== "xml" && tipo !== "danfe") {
      return jsonResp({ success: false, error: "Este arquivo ainda não está disponível para emitentes Unimake. Baixe o XML ou o DANFE da nota." }, 400);
    }
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
    return new Response(texto, {
      headers: { ...corsUnimake, "Content-Type": "application/xml", "Content-Disposition": `attachment; filename="nfe_${ctx.chave}.xml"` },
    });
  } catch (error) {
    console.error("Erro ao baixar arquivo via Unimake:", error);
    return jsonResp({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }, 500);
  }
});
