// DF-e (NF-es recebidas) e Manifestação do Destinatário via ACBr API Nuvem.
// Mesmo contrato de entrada/saída da função focus-nfe-mde, para que a tela
// de NF-es Recebidas funcione igual com qualquer provedor.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertInscricaoTenant, getCallerTenant, tenantErrorResponse } from "../_shared/tenant-guard.ts";
import { acbrFetch, buscarCredenciaisAcbr, obterTokenAcbr, type AcbrCredentials } from "../_shared/acbr-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SCOPE = "distribuicao-nfe";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const TIPO_EVENTO: Record<string, string> = {
  confirmacao: "210200",
  ciencia: "210210",
  desconhecimento: "210220",
  nao_realizada: "210240",
};
const EVENTO_TIPO: Record<string, string> = Object.fromEntries(Object.entries(TIPO_EVENTO).map(([k, v]) => [v, k]));

// deno-lint-ignore no-explicit-any
type Any = any;

async function lerJson(resp: Response): Promise<Any> {
  const t = await resp.text();
  try { return JSON.parse(t); } catch { return { raw: t }; }
}
function erroAcbr(d: Any, status: number): string {
  return d?.error?.message || d?.message || d?.motivo_status || d?.raw?.slice?.(0, 300) || `HTTP ${status}`;
}

/** Lista todos os documentos já distribuídos (armazenados na ACBr) para o CPF/CNPJ. */
async function listarDocumentos(cred: AcbrCredentials, token: string, doc: string, amb: string, chave?: string) {
  const out: Any[] = [];
  for (let skip = 0; skip < 5000; skip += 100) {
    const q = new URLSearchParams({ cpf_cnpj: doc, ambiente: amb, $top: "100", $skip: String(skip) });
    if (chave) q.set("chave_acesso", chave);
    const r = await acbrFetch(cred, `/distribuicao/nfe/documentos?${q}`, { token });
    const d = await lerJson(r);
    if (!r.ok) throw new Error(`ACBr API (documentos): ${erroAcbr(d, r.status)}`);
    const lista: Any[] = Array.isArray(d?.data) ? d.data : [];
    out.push(...lista);
    if (lista.length < 100) break;
  }
  return out;
}

async function listarManifestacoes(cred: AcbrCredentials, token: string, doc: string, amb: string) {
  const mapa = new Map<string, string>();
  for (let skip = 0; skip < 5000; skip += 100) {
    const q = new URLSearchParams({ cpf_cnpj: doc, ambiente: amb, $top: "100", $skip: String(skip) });
    const r = await acbrFetch(cred, `/distribuicao/nfe/manifestacoes?${q}`, { token });
    if (!r.ok) break;
    const d = await lerJson(r);
    const lista: Any[] = Array.isArray(d?.data) ? d.data : [];
    for (const m of lista) {
      const st = String(m?.status ?? "").toLowerCase();
      if (st && !["registrado", "autorizado", "vinculado"].some((s) => st.includes(s))) continue;
      const chave = String(m?.chave_acesso ?? m?.chave ?? "").replace(/\D/g, "");
      const tipo = EVENTO_TIPO[String(m?.tipo_evento ?? "")];
      if (chave && tipo && !mapa.has(chave)) mapa.set(chave, tipo);
    }
    if (lista.length < 100) break;
  }
  return mapa;
}

/** Converte documentos ACBr (notas, resumos) para o formato da tela. */
function paraNotas(docs: Any[], manifest: Map<string, string>) {
  const porChave = new Map<string, Any>();
  for (const d of docs) {
    if (d?.tipo_documento && d.tipo_documento !== "nota") continue;
    const chave = String(d?.chave_acesso ?? "").replace(/\D/g, "");
    if (chave.length !== 44) continue;
    const ant = porChave.get(chave);
    const item = {
      chave,
      nome: d.emitente_nome_razao_social ?? ant?.nome ?? "",
      cnpj: d.emitente_cpf_cnpj ?? ant?.cnpj ?? "",
      valor: Number(d.valor_nfe ?? ant?.valor ?? 0),
      data_emissao: d.data_emissao ?? d.data_evento ?? d.data_recebimento ?? ant?.data_emissao ?? "",
      situacao: d.situacao ?? ant?.situacao ?? "autorizada",
      tipo_nfe: d.tipo_nfe != null ? String(d.tipo_nfe) : ant?.tipo_nfe ?? "",
      numero: String(parseInt(chave.slice(25, 34), 10)),
      serie: String(parseInt(chave.slice(22, 25), 10)),
      manifestacao_destinatario: manifest.get(chave),
      nfe_completa: d.resumo === false || ant?.nfe_completa === true,
      _id_completo: d.resumo === false ? d.id : ant?._id_completo,
      _id: ant?._id ?? d.id,
    };
    porChave.set(chave, item);
  }
  return Array.from(porChave.values());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);
    const authCli = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: uErr } = await authCli.auth.getUser();
    if (uErr || !u?.user) return json({ error: "Não autenticado" }, 401);

    const body = await req.json().catch(() => ({}));
    const { action, inscricaoId, chave, tipo, justificativa } = body ?? {};
    if (typeof inscricaoId !== "string" || !inscricaoId) return json({ success: false, error: "inscricaoId é obrigatório" }, 400);
    if (typeof action !== "string") return json({ success: false, error: "action é obrigatório" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const caller = await getCallerTenant(admin, u.user.id);
    const guard = await assertInscricaoTenant(admin, inscricaoId, caller);
    if (!guard.ok) return tenantErrorResponse(guard, corsHeaders);

    const { data: insc } = await admin.from("inscricoes_produtor")
      .select("cpf_cnpj, emitente_id").eq("id", inscricaoId).maybeSingle();
    if (!insc?.emitente_id) return json({ success: false, error: "Inscrição sem emitente NF-e configurado." }, 400);
    const doc = String(insc.cpf_cnpj ?? "").replace(/\D/g, "");
    if (doc.length !== 11 && doc.length !== 14) return json({ success: false, error: "CPF/CNPJ inválido na inscrição." }, 400);

    const cred = await buscarCredenciaisAcbr(admin, insc.emitente_id);
    if (!cred) return json({ success: false, error: "Client ID / Client Secret da ACBr API não configurados para este emitente." }, 400);
    const amb = cred.ambiente === 2 ? "homologacao" : "producao";
    const token = await obterTokenAcbr(cred, SCOPE);
    const cleanChave = typeof chave === "string" ? chave.replace(/\D/g, "") : "";

    switch (action) {
      case "consultar": {
        // 1) Descobre o último NSU já recebido para não consumir indevidamente (rejeição 656).
        const antes = await listarDocumentos(cred, token, doc, amb);
        const ultNsu = antes.reduce((m, d) => Math.max(m, Number(d?.nsu ?? 0) || 0), 0);
        // 2) TRAVA DE CRÉDITOS: exatamente UM lote por clique (máx. 50 documentos),
        //    sem loop automático. Só refaz uma vez se a ACBr exigir outro dist_nsu.
        let aviso: string | undefined;
        const pedir = (nsu: number) => acbrFetch(cred, "/distribuicao/nfe", {
          method: "POST", token,
          body: { cpf_cnpj: doc, ambiente: amb, tipo_consulta: "dist-nsu", dist_nsu: nsu },
        });
        let pr = await pedir(ultNsu);
        let pd = await lerJson(pr);
        const exigido = /dist_nsu.*?igual a\s*(\d+)/i.exec(erroAcbr(pd, pr.status));
        if (!pr.ok && exigido) {
          pr = await pedir(Number(exigido[1]));
          pd = await lerJson(pr);
        }
        const msgErro = erroAcbr(pd, pr.status);
        if (!pr.ok && /cr[eé]dito/i.test(msgErro)) {
          aviso = "Os créditos da sua conta ACBr API acabaram. Faça uma recarga no painel da ACBr para continuar sincronizando. As notas já baixadas continuam disponíveis, e a busca por chave de acesso pode ser usada após a recarga.";
        } else if (!pr.ok) aviso = `SEFAZ/ACBr: ${msgErro}`;
        else if (pd?.codigo_status && ![137, 138].includes(Number(pd.codigo_status))) aviso = `SEFAZ: ${pd.codigo_status} - ${pd.motivo_status ?? ""}`;
        else {
          const ult = Number(pd?.ultimo_nsu ?? 0), max = Number(pd?.max_nsu ?? 0);
          if (max > ult && ult > 0) {
            const faltam = max - ult;
            aviso = `Lote processado. Ainda há cerca de ${faltam} documento(s) na fila da SEFAZ (consumo estimado de ${faltam} crédito(s)). Clique em Sincronizar novamente após 1 hora para buscar o próximo lote, ou use a busca por chave de acesso.`;
          }
        }
        // 3) Lista tudo o que já está disponível.
        const docs = pr.ok ? await listarDocumentos(cred, token, doc, amb) : antes;
        const manifest = await listarManifestacoes(cred, token, doc, amb);
        return json({ success: true, data: paraNotas(docs, manifest), warning: aviso });
      }

      case "consultar_chave": {
        if (cleanChave.length !== 44) return json({ success: false, error: "Chave deve ter 44 dígitos." }, 400);
        let docs = await listarDocumentos(cred, token, doc, amb, cleanChave);
        let aviso: string | undefined;
        if (!docs.length) {
          const pr = await acbrFetch(cred, "/distribuicao/nfe", {
            method: "POST", token,
            body: { cpf_cnpj: doc, ambiente: amb, tipo_consulta: "cons-chave", cons_chave: cleanChave },
          });
          const pd = await lerJson(pr);
          if (!pr.ok) aviso = erroAcbr(pd, pr.status);
          else if (pd?.motivo_status && Number(pd.codigo_status) !== 138) aviso = `SEFAZ: ${pd.codigo_status} - ${pd.motivo_status}`;
          docs = await listarDocumentos(cred, token, doc, amb, cleanChave);
        }
        const manifest = await listarManifestacoes(cred, token, doc, amb);
        return json({ success: true, data: paraNotas(docs, manifest), warning: aviso });
      }

      case "manifestar": {
        if (cleanChave.length !== 44) return json({ success: false, error: "Chave inválida." }, 400);
        const evento = TIPO_EVENTO[String(tipo)];
        if (!evento) return json({ success: false, error: "Tipo de manifestação inválido." }, 400);
        const corpo: Record<string, unknown> = { cpf_cnpj: doc, ambiente: amb, chave_acesso: cleanChave, tipo_evento: evento };
        if (evento === "210240" || evento === "210220") {
          corpo.justificativa = typeof justificativa === "string" && justificativa.trim().length >= 15
            ? justificativa.trim() : "Manifestacao registrada pelo destinatario via Sisagro";
        }
        const r = await acbrFetch(cred, "/distribuicao/nfe/manifestacoes", { method: "POST", token, body: corpo });
        const d = await lerJson(r);
        if (!r.ok) return json({ success: false, error: `Manifestação recusada: ${erroAcbr(d, r.status)}` });
        const st = String(d?.status ?? "").toLowerCase();
        if (st === "rejeitado" || st === "erro") {
          return json({ success: false, error: `SEFAZ rejeitou a manifestação: ${d?.motivo_status ?? st}` });
        }
        return json({ success: true, data: d });
      }

      case "download_xml":
      case "download_danfe": {
        if (cleanChave.length !== 44) return json({ success: false, error: "Chave inválida." }, 400);
        let docs = await listarDocumentos(cred, token, doc, amb, cleanChave);
        let completo = docs.find((d) => d?.tipo_documento !== "evento" && d?.resumo === false);
        if (!completo) {
          // Após a ciência, a SEFAZ libera o XML completo; pede-o por chave.
          await acbrFetch(cred, "/distribuicao/nfe", {
            method: "POST", token,
            body: { cpf_cnpj: doc, ambiente: amb, tipo_consulta: "cons-chave", cons_chave: cleanChave },
          }).catch(() => null);
          docs = await listarDocumentos(cred, token, doc, amb, cleanChave);
          completo = docs.find((d) => d?.tipo_documento !== "evento" && d?.resumo === false);
        }
        if (!completo) {
          return json({
            success: false,
            error: "O XML completo ainda não foi liberado pela SEFAZ. Manifeste a Ciência da Operação e tente novamente em alguns minutos.",
            nfe_completa: false,
          });
        }
        if (action === "download_xml") {
          const r = await acbrFetch(cred, `/distribuicao/nfe/documentos/${completo.id}/xml`, { token, accept: "application/xml" });
          const xml = await r.text();
          if (!r.ok) return json({ success: false, error: `Falha ao baixar XML (HTTP ${r.status}).` });
          return json({ success: true, xml });
        }
        const r = await acbrFetch(cred, `/distribuicao/nfe/documentos/${completo.id}/pdf`, { token, accept: "application/pdf" });
        if (!r.ok) return json({ success: false, error: `Falha ao gerar DANFE (HTTP ${r.status}).` });
        return new Response(await r.arrayBuffer(), { headers: { ...corsHeaders, "Content-Type": "application/pdf" } });
      }

      default:
        return json({ success: false, error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (e) {
    console.error("acbr-api-dfe:", e);
    return json({ success: false, error: (e as Error).message || "Erro na ACBr API" }, 500);
  }
});
