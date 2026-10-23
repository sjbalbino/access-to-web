// Consulta a situação da NF-e na SEFAZ via Unimake (UniNFe Cloud) e atualiza a nota.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertNotaFiscalTenant, getCallerTenant, tenantErrorResponse } from "../_shared/tenant-guard.ts";
import {
  autenticarUnimake, carregarContextoNota, corsUnimake, jsonResp, obterTokenUnimake, tpAmbUnimake,
  unimakeBaseUrl, unimakeErroTexto,
} from "../_shared/unimake-api.ts";
import { campoResposta } from "../_shared/unimake-xml.ts";

/** Converte cStat da SEFAZ no status interno da nota. */
export function statusPorCStat(cStat: string | undefined): string | null {
  if (!cStat) return null;
  if (["100", "150"].includes(cStat)) return "autorizada";
  if (["101", "151", "135", "155"].includes(cStat)) return "cancelada";
  if (["110", "301", "302", "303"].includes(cStat)) return "denegada";
  if (["217", "105", "106"].includes(cStat)) return null; // não localizada / em processamento
  return "rejeitada";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsUnimake });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const auth = await autenticarUnimake(req, admin, createClient, false);
    if (auth instanceof Response) return auth;

    const { notaFiscalId } = await req.json();
    if (!notaFiscalId) return jsonResp({ success: false, error: "notaFiscalId é obrigatório" }, 400);
    const caller = await getCallerTenant(admin, auth.userId);
    const guard = await assertNotaFiscalTenant(admin, notaFiscalId, caller);
    if (!guard.ok) return tenantErrorResponse(guard, corsUnimake);

    const ctx = await carregarContextoNota(admin, notaFiscalId);
    if (!ctx.chave) return jsonResp({ success: false, error: "A nota ainda não possui chave de acesso para consulta." });

    const token = await obterTokenUnimake(ctx.cred);
    const url = `${unimakeBaseUrl(ctx.cred.ambiente)}/api/v1/${ctx.docEmitente}/NFe/Consultar/${ctx.chave}?tpAmb=${tpAmbUnimake(ctx.cred.ambiente)}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/xml" } });
    const texto = await resp.text();
    console.log("Unimake consulta HTTP", resp.status, texto.slice(0, 2000));
    if (!resp.ok) return jsonResp({ success: false, error: unimakeErroTexto(texto, resp.status) });

    // A resposta traz o cStat da consulta e, dentro de protNFe/retCancNFe, o da nota.
    const cStatProt = campoResposta(texto, "cStat");
    const xMotivo = campoResposta(texto, "xMotivo");
    const nProt = campoResposta(texto, "nProt");
    const dhRecbto = campoResposta(texto, "dhRecbto");
    const temCancelamento = /110111|retCancNFe|procEventoNFe/i.test(texto) && /<(?:\w+:)?cStat>(135|155)</i.test(texto);
    const status = temCancelamento ? "cancelada" : statusPorCStat(cStatProt);

    const data: Record<string, unknown> = {
      status: status ?? ctx.nota.status,
      status_sefaz: cStatProt,
      mensagem_sefaz: xMotivo,
      chave_nfe: ctx.chave,
      numero: ctx.nota.numero,
      serie: ctx.nota.serie,
    };
    if (nProt && status === "autorizada") data.protocolo = nProt;

    if (status) {
      const upd: Record<string, unknown> = { status };
      if (status === "autorizada" && nProt) upd.protocolo = nProt;
      if (xMotivo) upd.motivo_status = `${cStatProt ?? ""} ${xMotivo}`.trim().slice(0, 1000);
      if (status === "autorizada" && dhRecbto) upd.data_autorizacao = dhRecbto;
      await admin.from("notas_fiscais").update(upd).eq("id", notaFiscalId);

      const numero = Number(ctx.nota.numero ?? 0);
      const emit = ctx.nota.emitentes_nfe;
      if (status === "autorizada" && numero > Number(emit?.numero_atual_nfe ?? 0)) {
        await admin.from("emitentes_nfe").update({ numero_atual_nfe: numero }).eq("id", ctx.emitenteId);
      }
    }

    return jsonResp({ success: true, data, erros: [], errosApi: null });
  } catch (error) {
    console.error("Erro ao consultar NF-e via Unimake:", error);
    return jsonResp({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }, 500);
  }
});
