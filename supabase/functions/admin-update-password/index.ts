import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  user_id: string;
  password: string;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function traduzirErro(msg: string): string {
  const m = (msg || "").toLowerCase();
  if (m.includes("different from the old")) return "A nova senha deve ser diferente da senha atual.";
  if (m.includes("pwned") || m.includes("leaked") || m.includes("compromised"))
    return "Esta senha foi encontrada em vazamentos de dados. Escolha uma senha mais segura.";
  if (m.includes("weak") || m.includes("password should")) return "Senha fraca. Use uma senha mais forte.";
  if (m.includes("same")) return "A nova senha deve ser diferente da senha atual.";
  return msg || "Erro ao alterar senha.";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(200, { error: "Não autorizado" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !caller) return json(200, { error: "Usuário não autenticado" });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (callerRole?.role !== "admin") {
      return json(200, { error: "Apenas administradores podem alterar senhas" });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", caller.id)
      .single();

    const isSuperAdmin = callerProfile?.tenant_id === null;

    const { user_id, password }: Body = await req.json();

    if (!user_id || !password) return json(200, { error: "user_id e password são obrigatórios" });
    if (password.length < 6) return json(200, { error: "A senha deve ter pelo menos 6 caracteres" });

    if (!isSuperAdmin) {
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("tenant_id")
        .eq("id", user_id)
        .single();

      if (!targetProfile || targetProfile.tenant_id !== callerProfile?.tenant_id) {
        return json(200, { error: "Usuário não pertence à sua empresa" });
      }
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password },
    );

    if (updateError) {
      console.error("updateUserById error:", updateError);
      return json(200, { error: traduzirErro(updateError.message) });
    }

    return json(200, { success: true });
  } catch (error) {
    console.error("admin-update-password error:", error);
    return json(200, { error: (error as Error)?.message || "Erro interno do servidor" });
  }
});
