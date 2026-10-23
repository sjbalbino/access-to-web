// Emite Carta de Correção (evento 110110) via Unimake (UniNFe Cloud).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertNotaFiscalTenant, getCallerTenant, tenantErrorResponse } from "../_shared/tenant-guard.ts";
import {
  autenticarUnimake, carregarContextoNota, corsUnimake, jsonResp, tpAmbUnimake, unimakeErroTexto, unimakeXmlPost,
} from "../_shared/unimake-api.ts";
import { campoResposta, montarEnvEvento } from "../_shared/unimake-xml.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsUnimake });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const auth = await autenticarUnimake(req, admin, createClient);
    if (auth instanceof Response) return auth;

    const { notaFiscalId, correcao: cRaw } = await req.json();
    const correcao = typeof cRaw === "string" ? cRaw.trim() : "";
    if (!notaFiscalId) return jsonResp({ success: false, error: "notaFiscalId é obrigatório" }, 400);
    if (correcao.length < 15 || correcao.length > 1000) {
      return jsonResp({ success: false, error: "A correção deve ter entre 15 e 1000 caracteres" }, 400);
    }
    const caller = await getCallerTenant(admin, auth.userId);
    const guard = await assertNotaFiscalTenant(admin, notaFiscalId, caller);
    if (!guard.ok) return tenantErrorResponse(guard, corsUnimake);

    const ctx = await carregarContextoNota(admin, notaFiscalId);
    if (!ctx.chave) return jsonResp({ success: false, error: "A nota não possui chave de acesso." }, 400);

    // Sequência: conta as CC-e já registradas no texto complementar (+1)
    const anteriores = (String(ctx.nota.info_complementar ?? "").match(/Carta de Corre[cç][aã]o \(/g) ?? []).length;
    const nSeq = Math.min(anteriores + 1, 20);

    const xml = montarEnvEvento({
      tipo: "cce", chave: ctx.chave, docEmitente: ctx.docEmitente,
      tpAmb: tpAmbUnimake(ctx.cred.ambiente), nSeq, correcao,
    });
    const r = await unimakeXmlPost(ctx.cred, `/api/v1/${ctx.docEmitente}/NFe/RecepcaoEvento`, xml);
    console.log("Unimake CC-e HTTP", r.status, r.texto.slice(0, 2000));
    const cStat = campoResposta(r.texto, "cStat");
    const xMotivo = campoResposta(r.texto, "xMotivo");
    if (!r.ok || cStat !== "135") {
      const msg = cStat ? `Rejeição ${cStat}: ${xMotivo ?? ""}`.trim() : unimakeErroTexto(r.texto, r.status);
      return jsonResp({ success: false, error: msg }, 400);
    }

    const novaInfo = `${ctx.nota.info_complementar || ""}\n\nCarta de Correção (${new Date().toLocaleDateString("pt-BR")}): ${correcao}`.trim();
    await admin.from("notas_fiscais").update({ info_complementar: novaInfo }).eq("id", notaFiscalId);

    return jsonResp({ success: true, data: { status: "autorizado", codigo_status: cStat, mensagem_sefaz: xMotivo, sequencia: nSeq } });
  } catch (error) {
    console.error("Erro na CC-e via Unimake:", error);
    return jsonResp({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }, 500);
  }
});
