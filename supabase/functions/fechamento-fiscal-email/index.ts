// Envia o pacote do fechamento fiscal mensal (ZIP com XMLs/DANFEs) ao contador via Resend.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enviarEmailResend } from "../_shared/resend-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Limite do Resend é ~40MB por e-mail (já em base64); mantemos margem.
const MAX_BASE64 = 35 * 1024 * 1024;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: ue } = await client.auth.getUser();
    if (ue || !u?.user) return json({ error: "Não autenticado" }, 401);

    const { emails, assunto, resumoLinhas, nomeArquivo, zipBase64 } = await req.json();
    const lista = Array.isArray(emails)
      ? [...new Set((emails as unknown[]).filter((e): e is string => typeof e === "string").map((e) => e.trim()).filter((e) => EMAIL_RE.test(e)))]
      : [];
    if (!lista.length) return json({ error: "Informe ao menos um e-mail válido." }, 400);
    if (lista.length > 10) return json({ error: "Máximo de 10 destinatários." }, 400);
    if (typeof zipBase64 !== "string" || !zipBase64) return json({ error: "Pacote ZIP ausente." }, 400);
    if (zipBase64.length > MAX_BASE64) {
      return json({ error: "O pacote é grande demais para e-mail (máx. ~25 MB). Baixe o ZIP e envie por outro meio." }, 400);
    }
    const linhas = Array.isArray(resumoLinhas) ? (resumoLinhas as unknown[]).map(String).slice(0, 40) : [];
    const html = `<p>Olá,</p><p>Segue em anexo o fechamento fiscal (XMLs e DANFEs).</p><ul>${linhas
      .map((l) => `<li>${esc(l)}</li>`).join("")}</ul><p>Enviado pelo SisAgro.</p>`;

    const r = await enviarEmailResend({
      to: lista,
      subject: String(assunto || "Fechamento fiscal").slice(0, 200),
      html,
      attachments: [{ filename: String(nomeArquivo || "fechamento.zip").replace(/[^\w.\-]/g, "_"), content: zipBase64 }],
    });
    if (!r.ok) {
      console.error("Resend falhou", r.status, r.body);
      return json({ error: `Falha no envio do e-mail (${r.status})`, details: r.body }, 502);
    }
    return json({ success: true, enviados: lista });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
