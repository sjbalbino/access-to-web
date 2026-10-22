// Recebe o certificado A1 (.pfx) + senha de um emitente, valida localmente (senha, validade, titular)
// e o envia ao provedor fiscal configurado (ACBr API Nuvem ou Focus NFe).
// O arquivo e a senha NUNCA são gravados no banco do Sisagro: só nome do titular e validade.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";
import { assertEmitenteTenant, getCallerTenant, tenantErrorResponse } from "../_shared/tenant-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ACBR_AUTH = "https://auth.acbr.api.br/realms/ACBrAPI/protocol/openid-connect/token";
const acbrBase = (amb?: number | null) => (amb === 2 ? "https://hom.acbr.api.br" : "https://prod.acbr.api.br");
const focusBase = (amb?: number | null) => (amb === 2 ? "https://homologacao.focusnfe.com.br" : "https://api.focusnfe.com.br");

interface CertInfo { titular: string; documento: string | null; validade: string; inicio: string }

function lerCertificado(b64: string, senha: string): CertInfo {
  const der = forge.util.decode64(b64);
  const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(der), senha);
  const bags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
  // Certificado do titular = o que não é CA
  // deno-lint-ignore no-explicit-any
  const cert = (bags.map((b: any) => b.cert).find((c: any) => c && !c.extensions?.some((e: any) => e.name === "basicConstraints" && e.cA)) ?? bags[0]?.cert);
  if (!cert) throw new Error("Nenhum certificado encontrado no arquivo.");
  const cn = String(cert.subject.getField("CN")?.value ?? "");
  const [nome, doc] = cn.split(":");
  return {
    titular: nome || cn,
    documento: doc ? doc.replace(/\D/g, "") : null,
    validade: cert.validity.notAfter.toISOString(),
    inicio: cert.validity.notBefore.toISOString(),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ success: false, error: "Não autorizado" }, 401);
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await authClient.auth.getUser();
    if (!u?.user) return json({ success: false, error: "Não autenticado" }, 401);

    const body = await req.json().catch(() => ({}));
    const emitente_id = typeof body.emitente_id === "string" ? body.emitente_id : "";
    const certificado = typeof body.certificado_base64 === "string" ? body.certificado_base64.replace(/^data:.*?,/, "") : "";
    const senha = typeof body.senha === "string" ? body.senha : "";
    if (!emitente_id || !certificado || !senha) {
      return json({ success: false, error: "Informe o arquivo do certificado (.pfx) e a senha." });
    }
    if (certificado.length > 200_000) return json({ success: false, error: "Arquivo muito grande para um certificado A1." });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const caller = await getCallerTenant(admin, u.user.id);
    const guard = await assertEmitenteTenant(admin, emitente_id, caller);
    if (!guard.ok) return tenantErrorResponse(guard, corsHeaders);

    // 1) Validação local: senha, validade e titular
    let info: CertInfo;
    try {
      info = lerCertificado(certificado, senha);
    } catch (e) {
      const msg = String((e as Error).message || "");
      return json({ success: false, error: /password|MAC|Invalid/i.test(msg)
        ? "Senha do certificado incorreta ou arquivo inválido."
        : `Não foi possível ler o certificado: ${msg}` });
    }
    if (new Date(info.validade) < new Date()) {
      return json({ success: false, error: `Este certificado venceu em ${new Date(info.validade).toLocaleDateString("pt-BR")}. Envie um certificado válido.` });
    }

    const { data: em } = await admin
      .from("emitentes_nfe")
      .select("id, ambiente, api_provider, emitentes_nfe_credentials(api_consumer_key, api_consumer_secret)")
      .eq("id", emitente_id).maybeSingle();
    if (!em) return json({ success: false, error: "Emitente não encontrado." });

    const { data: insc } = await admin.from("inscricoes_produtor")
      .select("cpf_cnpj, is_emitente_principal").eq("emitente_id", emitente_id).not("cpf_cnpj", "is", null);
    // deno-lint-ignore no-explicit-any
    const doc = String(((insc ?? []).find((i: any) => i.is_emitente_principal) ?? insc?.[0])?.cpf_cnpj ?? "").replace(/\D/g, "");
    if (!doc) return json({ success: false, error: "Vincule uma inscrição com CPF/CNPJ a este emitente antes de enviar o certificado." });
    if (info.documento && info.documento !== doc) {
      return json({ success: false, error: `O certificado pertence ao CPF/CNPJ ${info.documento}, mas o emitente é ${doc}.` });
    }

    // 2) Envio ao provedor
    if (em.api_provider === "unimake") {
      // deno-lint-ignore no-explicit-any
      const credRaw = (em as any).emitentes_nfe_credentials;
      const cred = Array.isArray(credRaw) ? credRaw[0] : credRaw;
      if (!cred?.api_consumer_key || !cred?.api_consumer_secret) {
        return json({ success: false, error: "Informe e salve o App ID e o Secret da Unimake antes de enviar o certificado." });
      }
      const { obterTokenUnimake, unimakeBaseUrl, unimakeErrorMessage } = await import("../_shared/unimake-api.ts");
      const uniCred = { appId: cred.api_consumer_key, secret: cred.api_consumer_secret, ambiente: em.ambiente };
      let token: string;
      try {
        token = await obterTokenUnimake(uniCred);
      } catch (e) {
        return json({ success: false, error: (e as Error).message });
      }
      const base = unimakeBaseUrl(em.ambiente);
      // 2a) Cadastra o certificado (metadados)
      const add = await fetch(`${base}/api/v1/Certificate/Add`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          certificateType: "A1",
          cpfcnpj: doc,
          description: info.titular,
          expiresOn: info.validade,
          password: senha,
          privateKey: certificado,
        }),
      });
      if (!add.ok) {
        return json({ success: false, error: `A Unimake não aceitou o certificado: ${await unimakeErrorMessage(add)}` });
      }
      const addResp = await add.json().catch(() => ({}));
      const certId = addResp?.id;
      if (!certId) {
        return json({ success: false, error: "A Unimake cadastrou o certificado, mas não retornou o identificador para o envio do arquivo." });
      }
      // 2b) Envia o arquivo .pfx (multipart)
      const pfxBytes = Uint8Array.from(atob(certificado), (c) => c.charCodeAt(0));
      const form = new FormData();
      form.append("Filename", new Blob([pfxBytes], { type: "application/x-pkcs12" }), "certificado.pfx");
      form.append("Password", senha);
      const up = await fetch(`${base}/api/v1/Certificate/Upload/${certId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!up.ok) {
        return json({ success: false, error: `A Unimake não aceitou o arquivo do certificado: ${await unimakeErrorMessage(up)}` });
      }
    } else if (em.api_provider === "acbrapi") {
      // deno-lint-ignore no-explicit-any
      const credRaw = (em as any).emitentes_nfe_credentials;
      const cred = Array.isArray(credRaw) ? credRaw[0] : credRaw;
      if (!cred?.api_consumer_key || !cred?.api_consumer_secret) {
        return json({ success: false, error: "Informe e salve o Client ID e o Client Secret da ACBr API antes de enviar o certificado." });
      }
      const tk = await fetch(ACBR_AUTH, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "client_credentials", client_id: cred.api_consumer_key, client_secret: cred.api_consumer_secret, scope: "empresa nfe" }),
      });
      if (!tk.ok) return json({ success: false, error: `A ACBr recusou as credenciais (HTTP ${tk.status}).` });
      const { access_token } = await tk.json();
      const r = await fetch(`${acbrBase(em.ambiente)}/empresas/${doc}/certificado`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ certificado, password: senha }),
      });
      if (!r.ok) {
        const t = await r.json().catch(() => ({}));
        const msg = t?.error?.message || t?.message || `HTTP ${r.status}`;
        return json({ success: false, error: r.status === 404
          ? `CPF/CNPJ ${doc} não está cadastrado na ACBr API. Cadastre a empresa no painel da ACBr e tente de novo.`
          : `A ACBr não aceitou o certificado: ${msg}` });
      }
    } else {
      const token = Deno.env.get("FOCUSNFE_TOKEN");
      if (!token) return json({ success: false, error: "Token principal da Focus NFe não configurado." });
      const auth = "Basic " + btoa(`${token}:`);
      const campo = doc.length === 11 ? "cpf" : "cnpj";
      const busca = await fetch(`https://api.focusnfe.com.br/v2/empresas?${campo}=${doc}`, { headers: { Authorization: auth } });
      const lista = busca.ok ? await busca.json().catch(() => []) : [];
      const empresa = Array.isArray(lista) ? lista[0] : null;
      if (!empresa?.id) {
        return json({ success: false, error: `CPF/CNPJ ${doc} não foi encontrado na conta Focus NFe (ou o token não tem permissão de revenda).` });
      }
      const r = await fetch(`https://api.focusnfe.com.br/v2/empresas/${empresa.id}`, {
        method: "PUT",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ arquivo_certificado_base64: certificado, senha_certificado: senha }),
      });
      if (!r.ok) {
        const t = await r.json().catch(() => ({}));
        return json({ success: false, error: `A Focus NFe não aceitou o certificado: ${t?.mensagem || `HTTP ${r.status}`}` });
      }
      void focusBase;
    }

    // 3) Grava somente metadados
    await admin.from("emitentes_nfe").update({
      certificado_nome: info.titular,
      certificado_validade: info.validade.slice(0, 10),
    }).eq("id", emitente_id);

    return json({ success: true, titular: info.titular, validade: info.validade, documento: info.documento ?? doc });
  } catch (e) {
    return json({ success: false, error: `Falha ao enviar o certificado: ${(e as Error).message}` });
  }
});
