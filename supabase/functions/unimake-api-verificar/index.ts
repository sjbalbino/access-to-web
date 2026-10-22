// Verifica a conexão do emitente com a Unimake (UniNFe Cloud):
// 1) autentica com App ID + Secret; 2) confere se há certificado A1 cadastrado para o CPF/CNPJ.
// Credenciais lidas do emitente (nunca do frontend).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertEmitenteTenant, getCallerTenant, tenantErrorResponse } from "../_shared/tenant-guard.ts";
import {
  buscarCredenciaisUnimake,
  obterTokenUnimake,
  unimakeAmbienteLabel,
  unimakeBaseUrl,
  unimakeErrorMessage,
} from "../_shared/unimake-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

    const cred = await buscarCredenciaisUnimake(supabase, emitente_id);
    const ambLabel = unimakeAmbienteLabel(cred?.ambiente);
    if (!cred) {
      return json({ success: false, error: "Informe o App ID e o Secret da Unimake e salve o emitente." });
    }

    // 1) Autenticação
    let token: string;
    try {
      token = await obterTokenUnimake(cred);
    } catch (e) {
      return json({ success: true, habilitada: false, ambiente_label: ambLabel, mensagem: (e as Error).message });
    }

    // 2) Certificado do CPF/CNPJ na Unimake
    const r = await fetch(`${unimakeBaseUrl(cred.ambiente)}/api/v1/Certificate/Get?CPFCNPJ=${doc}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (r.status === 204) {
      return json({
        success: true, habilitada: false, ambiente_label: ambLabel,
        mensagem: `Credenciais válidas, mas não há certificado A1 cadastrado para o CPF/CNPJ ${doc} na Unimake (${ambLabel}). Envie o certificado pelo botão "Certificado A1" desta tela.`,
      });
    }
    if (!r.ok) {
      return json({
        success: true, habilitada: false, ambiente_label: ambLabel,
        mensagem: `A Unimake respondeu com erro ao consultar o certificado: ${await unimakeErrorMessage(r)}`,
      });
    }
    const lista = await r.json().catch(() => []);
    const certs = (Array.isArray(lista) ? lista : []) as { cpfcnpj?: string; expiresOn?: string; description?: string }[];
    const cert = certs.find((c) => String(c.cpfcnpj ?? "").replace(/\D/g, "") === doc) ?? certs[0];
    if (!cert) {
      return json({
        success: true, habilitada: false, ambiente_label: ambLabel,
        mensagem: `Credenciais válidas, mas não há certificado A1 cadastrado para o CPF/CNPJ ${doc} na Unimake (${ambLabel}). Envie o certificado pelo botão "Certificado A1" desta tela.`,
      });
    }
    const validade = cert.expiresOn ? new Date(cert.expiresOn) : null;
    if (validade && validade < new Date()) {
      return json({
        success: true, habilitada: false, ambiente_label: ambLabel,
        mensagem: `O certificado do CPF/CNPJ ${doc} venceu em ${validade.toLocaleDateString("pt-BR")}. Envie um certificado renovado.`,
      });
    }
    return json({
      success: true, habilitada: true, ambiente_label: ambLabel,
      nome: cert.description ?? null,
      mensagem: `Certificado A1 ativo na Unimake${validade ? ` (válido até ${validade.toLocaleDateString("pt-BR")})` : ""}.`,
    });
  } catch (e) {
    return json({ success: false, error: `Falha ao consultar a Unimake: ${(e as Error).message}` });
  }
});
