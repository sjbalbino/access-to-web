import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Endpoint público (sem JWT) — chamado logo após signUp, antes do usuário estar logado.
// Recebe { user_id, email, nome } e dispara dois e-mails: confirmação ao usuário + aviso aos admins.

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Carrega dados do profile do servidor (nunca confia em email/nome do body — evita spoofing/spam)
    const { data: profile } = await admin
      .from("profiles").select("id, email, nome, ativo, tenant_id, created_at").eq("id", user_id).single();
    if (!profile || !profile.email) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Anti-spam: só envia se o profile foi criado nos últimos 5 minutos.
    // Como o idempotencyKey é `signup-user-${user_id}`, reenviar para o mesmo user_id
    // é ignorado pelo send-transactional-email, mas a janela evita reuso indefinido.
    const createdAt = profile.created_at ? new Date(profile.created_at).getTime() : 0;
    if (Date.now() - createdAt > 5 * 60 * 1000) {
      return new Response(JSON.stringify({ success: true, skipped: "fora_janela_signup" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const usuarioEmail = profile.email;
    const usuarioNome = profile.nome || "";

    // E-mail 1: confirmação ao usuário (usa email do profile, não do body)
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "cadastro-recebido-usuario",
          recipientEmail: usuarioEmail,
          idempotencyKey: `signup-user-${user_id}`,
          templateData: { nome: usuarioNome },
        },
      });
    } catch (e) {
      console.error("[notify-new-signup] e-mail usuário falhou:", e);
    }

    // E-mail 2: aviso aos admins (todos com role=admin)
    const { data: adminRoles } = await admin
      .from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = (adminRoles || []).map((r: any) => r.user_id);

    if (adminIds.length > 0) {
      const { data: adminProfiles } = await admin
        .from("profiles").select("email, nome").in("id", adminIds);

      for (const ap of adminProfiles || []) {
        if (!ap.email) continue;
        try {
          await admin.functions.invoke("send-transactional-email", {
            body: {
              templateName: "cadastro-recebido-admin",
              recipientEmail: ap.email,
              idempotencyKey: `signup-admin-${user_id}-${ap.email}`,
              templateData: {
                adminNome: ap.nome || "",
                usuarioNome,
                usuarioEmail,
              },
            },
          });
        } catch (e) {
          console.error("[notify-new-signup] e-mail admin falhou:", e);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-new-signup]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
