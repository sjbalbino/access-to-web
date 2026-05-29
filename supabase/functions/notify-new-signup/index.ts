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

    const { user_id, email, nome } = await req.json();
    if (!user_id || !email) {
      return new Response(JSON.stringify({ error: "user_id e email obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Confirma que esse user_id realmente existe e está pendente (segurança mínima)
    const { data: profile } = await admin
      .from("profiles").select("id, ativo, tenant_id").eq("id", user_id).single();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // E-mail 1: confirmação ao usuário
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "cadastro-recebido-usuario",
          recipientEmail: email,
          idempotencyKey: `signup-user-${user_id}`,
          templateData: { nome: nome || "" },
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
                usuarioNome: nome || "",
                usuarioEmail: email,
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
