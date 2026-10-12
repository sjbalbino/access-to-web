// Verifica se a empresa (CPF/CNPJ) está cadastrada na ACBr API Nuvem.
// Autenticação OAuth2 client_credentials; credenciais lidas do emitente (nunca do frontend).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertEmitenteTenant, getCallerTenant, tenantErrorResponse } from "../_shared/tenant-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const AUTH_URL = "https://auth.acbr.api.br/realms/ACBrAPI/protocol/openid-connect/token";
const baseUrl = (amb: number | null | undefined) => (amb === 2 ? "https://hom.acbr.api.br" : "https://prod.acbr.api.br");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ success: false, error: "Não autorizado" }, 401);
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: uErr } = await authClient.auth.getUser();
    if (uErr || !u?.user) return json({ success: false, error: "Não autenticado" }, 401);

    const { emitente_id, cpf_cnpj } = await req.json().catch(() => ({}));
    if (!emitente_id || !cpf_cnpj) return json({ success: false, error: "emitente_id e cpf_cnpj são obrigatórios" });
    const doc = String(cpf_cnpj).replace(/\D/g, "");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const caller = await getCallerTenant(supabase, u.user.id);
    const guard = await assertEmitenteTenant(supabase, emitente_id, caller);
    if (!guard.ok) return tenantErrorResponse(guard, corsHeaders);

    const { data: em } = await supabase
      .from("emitentes_nfe")
      .select("ambiente, emitentes_nfe_credentials(api_consumer_key, api_consumer_secret)")
      .eq("id", emitente_id)
      .maybeSingle();
    const credRaw = (em as any)?.emitentes_nfe_credentials;
    const cred = Array.isArray(credRaw) ? credRaw[0] : credRaw;
    const ambLabel = em?.ambiente === 2 ? "homologação" : "produção";
    if (!cred?.api_consumer_key || !cred?.api_consumer_secret) {
      return json({ success: false, error: "Informe o Client ID e o Client Secret da ACBr API e salve o emitente." });
    }

    // 1) Token OAuth
    const tk = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: cred.api_consumer_key,
        client_secret: cred.api_consumer_secret,
        scope: "empresa nfe cep cnpj",
      }),
    });
    if (!tk.ok) {
      return json({ success: true, habilitada: false, ambiente_label: ambLabel,
        mensagem: `A ACBr recusou as credenciais (HTTP ${tk.status}). Confira o Client ID e o Client Secret no painel da ACBr API.` });
    }
    const { access_token } = await tk.json();

    // 2) Consulta da empresa
    const r = await fetch(`${baseUrl(em?.ambiente)}/empresas/${doc}`, {
      headers: { Authorization: `Bearer ${access_token}`, Accept: "application/json" },
    });
    if (r.status === 404) {
      return json({ success: true, habilitada: false, ambiente_label: ambLabel,
        mensagem: `CPF/CNPJ ${doc} não está cadastrado na ACBr API (${ambLabel}). Cadastre a empresa e o certificado no painel da ACBr.` });
    }
    if (!r.ok) {
      return json({ success: true, habilitada: false, ambiente_label: ambLabel,
        mensagem: `A ACBr API respondeu com erro (HTTP ${r.status}) ao consultar a empresa.` });
    }
    const emp = await r.json();
    return json({ success: true, habilitada: true, ambiente_label: ambLabel, nome: emp?.nome_razao_social ?? emp?.nome ?? null });
  } catch (e) {
    return json({ success: false, error: `Falha ao consultar a ACBr API: ${(e as Error).message}` });
  }
});
