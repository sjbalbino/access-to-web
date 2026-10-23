// Inutiliza faixa de numeração de NF-e via Unimake (UniNFe Cloud) — inutNFe.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertEmitenteTenant, getCallerTenant, tenantErrorResponse } from "../_shared/tenant-guard.ts";
import {
  autenticarUnimake, buscarCredenciaisUnimake, corsUnimake, jsonResp, tpAmbUnimake, unimakeErroTexto, unimakeXmlPost,
} from "../_shared/unimake-api.ts";
import { campoResposta, montarInutNFe } from "../_shared/unimake-xml.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsUnimake });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const auth = await autenticarUnimake(req, admin, createClient);
    if (auth instanceof Response) return auth;

    const { emitenteId, serie, numeroInicial, numeroFinal, justificativa: jRaw } = await req.json();
    const justificativa = typeof jRaw === "string" ? jRaw.trim() : "";
    const nIni = Number(numeroInicial), nFin = Number(numeroFinal), s = Number(serie);
    if (!emitenteId) return jsonResp({ success: false, error: "emitenteId é obrigatório" }, 400);
    if (!Number.isInteger(s) || s < 0) return jsonResp({ success: false, error: "Série inválida" }, 400);
    if (!Number.isInteger(nIni) || !Number.isInteger(nFin) || nIni < 1 || nFin < nIni) {
      return jsonResp({ success: false, error: "Faixa de numeração inválida" }, 400);
    }
    if (justificativa.length < 15) return jsonResp({ success: false, error: "Justificativa deve ter no mínimo 15 caracteres" }, 400);

    const caller = await getCallerTenant(admin, auth.userId);
    const guard = await assertEmitenteTenant(admin, emitenteId, caller);
    if (!guard.ok) return tenantErrorResponse(guard, corsUnimake);

    const { data: emit } = await admin
      .from("emitentes_nfe")
      .select("id, numero_atual_nfe, inscricao:inscricoes_produtor!emitentes_nfe_inscricao_produtor_id_fkey(cpf_cnpj, uf)")
      .eq("id", emitenteId).maybeSingle();
    if (!emit) return jsonResp({ success: false, error: "Emitente não encontrado" }, 404);
    const doc = String(emit.inscricao?.cpf_cnpj ?? "").replace(/\D/g, "");
    if (doc.length !== 14) {
      return jsonResp({ success: false, error: "Inutilização só é permitida para emitente com CNPJ (NT 2018/001). Para produtor pessoa física basta seguir a numeração." }, 400);
    }
    const cred = await buscarCredenciaisUnimake(admin, emitenteId);
    if (!cred) return jsonResp({ success: false, error: "App ID / Secret da Unimake não configurados para este emitente." }, 400);

    const xml = montarInutNFe({
      uf: String(emit.inscricao?.uf ?? ""), cnpj: doc, tpAmb: tpAmbUnimake(cred.ambiente),
      serie: s, nIni, nFin, justificativa,
    });
    const r = await unimakeXmlPost(cred, `/api/v1/${doc}/NFe/Inutilizacao`, xml);
    console.log("Unimake inutilização HTTP", r.status, r.texto.slice(0, 2000));
    const cStat = campoResposta(r.texto, "cStat");
    const xMotivo = campoResposta(r.texto, "xMotivo");
    if (!r.ok || cStat !== "102") {
      const msg = cStat ? `Rejeição ${cStat}: ${xMotivo ?? ""}`.trim() : unimakeErroTexto(r.texto, r.status);
      return jsonResp({ success: false, error: msg }, 400);
    }

    if (nFin > Number(emit.numero_atual_nfe ?? 0)) {
      await admin.from("emitentes_nfe").update({ numero_atual_nfe: nFin }).eq("id", emitenteId);
    }
    return jsonResp({ success: true, data: { status: "autorizado", codigo_status: cStat, mensagem_sefaz: xMotivo, protocolo: campoResposta(r.texto, "nProt") } });
  } catch (error) {
    console.error("Erro na inutilização via Unimake:", error);
    return jsonResp({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }, 500);
  }
});
