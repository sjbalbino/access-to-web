// Cancela NF-e autorizada via Unimake (UniNFe Cloud) — evento 110111 (envEvento).
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

    const { notaFiscalId, justificativa: jRaw } = await req.json();
    if (!notaFiscalId) return jsonResp({ success: false, error: "notaFiscalId é obrigatório" }, 400);
    const justificativa = typeof jRaw === "string" ? jRaw.trim() : "";
    if (justificativa.length < 15) {
      return jsonResp({ success: false, error: "Justificativa é obrigatória e deve ter no mínimo 15 caracteres" }, 400);
    }

    const caller = await getCallerTenant(admin, auth.userId);
    const guard = await assertNotaFiscalTenant(admin, notaFiscalId, caller);
    if (!guard.ok) return tenantErrorResponse(guard, corsUnimake);

    const ctx = await carregarContextoNota(admin, notaFiscalId);
    if (!ctx.chave || !ctx.protocolo) {
      return jsonResp({ success: false, error: "A nota não possui chave de acesso ou protocolo de autorização para cancelar." }, 400);
    }

    const xml = montarEnvEvento({
      tipo: "cancelamento", chave: ctx.chave, docEmitente: ctx.docEmitente,
      tpAmb: tpAmbUnimake(ctx.cred.ambiente), protocolo: ctx.protocolo, justificativa,
    });
    const r = await unimakeXmlPost(ctx.cred, `/api/v1/${ctx.docEmitente}/NFe/RecepcaoEvento`, xml);
    console.log("Unimake cancelamento HTTP", r.status, r.texto.slice(0, 2000));

    const cStat = campoResposta(r.texto, "cStat");
    const xMotivo = campoResposta(r.texto, "xMotivo");
    const nProt = campoResposta(r.texto, "nProt");
    // 135 = evento homologado; 155 = cancelamento fora de prazo homologado
    const confirmado = r.ok && (cStat === "135" || cStat === "155");

    if (!confirmado) {
      const msg = cStat ? `Rejeição ${cStat}: ${xMotivo ?? ""}`.trim() : unimakeErroTexto(r.texto, r.status);
      await admin.from("notas_fiscais").update({ motivo_status: `Falha no cancelamento: ${msg}`.slice(0, 1000) }).eq("id", notaFiscalId);
      return jsonResp({ success: false, error: msg, details: { cStat, xMotivo } }, 400);
    }

    const { data: perfil } = await admin.from("profiles").select("nome, email").eq("id", auth.userId).maybeSingle();
    const { error: upErr } = await admin.from("notas_fiscais").update({
      status: "cancelada",
      motivo_status: `Cancelada${nProt ? ` - protocolo ${nProt}` : ""}: ${justificativa}`,
      cancelado_por: auth.userId,
      cancelado_por_nome: perfil?.nome || perfil?.email || auth.email || null,
      cancelado_em: new Date().toISOString(),
      cancelado_motivo: justificativa,
    }).eq("id", notaFiscalId);

    if (upErr) {
      console.error("Erro ao atualizar nota:", upErr);
    } else {
      // Propaga o cancelamento (mesma regra dos demais provedores)
      await admin.from("notas_deposito_emitidas").delete().eq("nota_fiscal_id", notaFiscalId);
      await admin.from("devolucoes_deposito").update({ status: "cancelada" }).eq("nota_fiscal_id", notaFiscalId);
      await admin.from("compras_cereais").update({ status: "cancelada" }).eq("nota_fiscal_id", notaFiscalId);
      await admin.from("remessas_venda").update({ status: "cancelada" }).eq("nota_fiscal_id", notaFiscalId);
    }

    return jsonResp({ success: true, data: { status: "cancelado", codigo_status: cStat, numero_protocolo: nProt, mensagem_sefaz: xMotivo } });
  } catch (error) {
    console.error("Erro ao cancelar NF-e via Unimake:", error);
    return jsonResp({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }, 500);
  }
});
