import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppRole = "admin" | "operador" | "visualizador" | "gerente";

interface ApproveBody {
  user_id: string;
  tenant_id: string | null;
  role: AppRole;
  ativo?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verificar role admin
    const { data: callerRole } = await admin
      .from("user_roles").select("role").eq("user_id", userData.user.id).single();
    if (callerRole?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Apenas administradores podem liberar usuários" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await admin
      .from("profiles").select("tenant_id, is_super_admin_original").eq("id", userData.user.id).single();
    const isSuperAdmin = !!callerProfile?.is_super_admin_original;

    const body: ApproveBody = await req.json();
    if (!body.user_id || !body.role) {
      return new Response(JSON.stringify({ error: "user_id e role são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tenant final: super admin escolhe; admin comum força próprio tenant
    const finalTenantId = isSuperAdmin ? (body.tenant_id ?? null) : (callerProfile?.tenant_id ?? null);

    // Atualizar profile
    console.log("[approve-user] updating profile", body.user_id, "tenant=", finalTenantId);
    const { error: profErr } = await admin
      .from("profiles")
      .update({ tenant_id: finalTenantId, ativo: body.ativo ?? true })
      .eq("id", body.user_id);
    if (profErr) { console.error("[approve-user] profErr", profErr); throw new Error(`profiles.update: ${profErr.message}`); }

    // Upsert user_roles
    const { data: existing, error: selErr } = await admin
      .from("user_roles").select("user_id").eq("user_id", body.user_id).maybeSingle();
    if (selErr) { console.error("[approve-user] selErr", selErr); throw new Error(`user_roles.select: ${selErr.message}`); }
    if (existing) {
      const { error } = await admin.from("user_roles").update({ role: body.role }).eq("user_id", body.user_id);
      if (error) { console.error("[approve-user] updRoleErr", error); throw new Error(`user_roles.update: ${error.message}`); }
    } else {
      const { error } = await admin.from("user_roles").insert({ user_id: body.user_id, role: body.role });
      if (error) { console.error("[approve-user] insRoleErr", error); throw new Error(`user_roles.insert: ${error.message}`); }
    }

    // Buscar dados para o e-mail
    const { data: approvedProfile } = await admin
      .from("profiles").select("email, nome, tenant_id").eq("id", body.user_id).single();

    let tenantName = "Super Admin (sem empresa)";
    if (approvedProfile?.tenant_id) {
      const { data: t } = await admin
        .from("tenants").select("razao_social, nome_fantasia").eq("id", approvedProfile.tenant_id).single();
      tenantName = t?.nome_fantasia || t?.razao_social || "—";
    }

    const roleLabels: Record<AppRole, string> = {
      admin: "Administrador", operador: "Operador", gerente: "Gerente", visualizador: "Visualizador",
    };

    // Enviar e-mail de liberação (não bloqueia se falhar)
    if (approvedProfile?.email) {
      try {
        await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "acesso-liberado",
            recipientEmail: approvedProfile.email,
            idempotencyKey: `acesso-liberado-${body.user_id}-${Date.now()}`,
            templateData: {
              nome: approvedProfile.nome || "",
              empresa: tenantName,
              nivel: roleLabels[body.role],
            },
          },
        });
      } catch (e) {
        console.error("[approve-user] e-mail falhou:", e);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[approve-user]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
