// Libera o ambiente de demonstração do SisAgro: registra o interessado como lead,
// garante que a empresa demo exista com dados fictícios e devolve credenciais
// temporárias (a senha muda a cada acesso).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_EMAIL = "demo@sisagro.app";
const DEMO_CNPJ = "00.000.000/0001-91";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return "Demo#" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function ensureCultura(admin: SupabaseClient, tenantId: string, nome: string): Promise<string> {
  const { data } = await admin.from("culturas").select("id").eq("tenant_id", tenantId).ilike("nome", nome).maybeSingle();
  if (data) return data.id;
  const { data: nova, error } = await admin
    .from("culturas").insert({ tenant_id: tenantId, nome, peso_saco_industria: 60, peso_saco_semente: 60 })
    .select("id").single();
  if (error) throw error;
  return nova.id;
}

async function ensureTenant(admin: SupabaseClient): Promise<string> {
  const { data: existing } = await admin.from("tenants").select("id").eq("cnpj", DEMO_CNPJ).maybeSingle();
  if (existing) return existing.id;

  const { data: tenant, error } = await admin.from("tenants").insert({
    razao_social: "AGROPECUÁRIA DEMONSTRAÇÃO LTDA",
    nome_fantasia: "Fazenda Modelo (Demonstração)",
    cnpj: DEMO_CNPJ,
    cidade: "Santo Ângelo", uf: "RS", cep: "98800-000",
    logradouro: "Linha Exemplo", numero: "S/N",
    telefone: "(55) 99639-1464", email: DEMO_EMAIL,
  }).select("id").single();
  if (error) throw error;
  const tenantId = tenant.id as string;

  const { data: granja, error: gErr } = await admin.from("granjas").insert({
    tenant_id: tenantId, razao_social: "GRANJA MODELO", nome_fantasia: "Sede Demonstração",
    cidade: "Santo Ângelo", uf: "RS", total_hectares: 850, is_principal: true,
  }).select("id").single();
  if (gErr) throw gErr;
  const granjaId = granja.id as string;

  const soja = await ensureCultura(admin, tenantId, "SOJA");
  const trigo = await ensureCultura(admin, tenantId, "TRIGO");

  await admin.from("safras").insert([
    { tenant_id: tenantId, codigo: "1", nome: "SOJA 2025/2026", cultura_id: soja, ano_colheita: 2026, status: "ativa", is_principal: true },
    { tenant_id: tenantId, codigo: "2", nome: "TRIGO 2026", cultura_id: trigo, ano_colheita: 2026, status: "ativa" },
  ]);

  await admin.from("lavouras").insert([
    { tenant_id: tenantId, granja_id: granjaId, codigo: 1, nome: "LAVOURA DA SEDE", total_hectares: 320, area_plantio: 310 },
    { tenant_id: tenantId, granja_id: granjaId, codigo: 2, nome: "LAVOURA DO RIO", total_hectares: 280, area_plantio: 270 },
    { tenant_id: tenantId, granja_id: granjaId, codigo: 3, nome: "LAVOURA DO CAPÃO", total_hectares: 250, area_plantio: 240 },
  ]);

  const produtores = [
    { nome: "JOSÉ DA SILVA (EXEMPLO)", cpf: "111.444.777-35", ie: "0000000011" },
    { nome: "MARIA OLIVEIRA (EXEMPLO)", cpf: "529.982.247-25", ie: "0000000022" },
    { nome: "PEDRO SOUZA (EXEMPLO)", cpf: "390.533.447-05", ie: "0000000033" },
  ];
  for (const [i, p] of produtores.entries()) {
    const { data: prod } = await admin.from("produtores").insert({
      tenant_id: tenantId, granja_id: granjaId, codigo: String(i + 1), nome: p.nome,
      tipo_pessoa: "fisica", cpf_cnpj: p.cpf, cidade: "Santo Ângelo", uf: "RS",
      tipo_produtor: i === 0 ? "socio" : "produtor", percentual_participacao: i === 0 ? 100 : 0,
    }).select("id").single();
    if (prod) {
      await admin.from("inscricoes_produtor").insert({
        produtor_id: prod.id, granja_id: granjaId, cpf_cnpj: p.cpf, inscricao_estadual: p.ie,
        nome: p.nome, cidade: "Santo Ângelo", uf: "RS", tipo: "produtor",
      });
    }
  }

  return tenantId;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const nome = String(body.nome ?? "").trim().slice(0, 150);
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 255);
    const telefone = String(body.telefone ?? "").trim().slice(0, 20);
    const empresa = String(body.empresa ?? "").trim().slice(0, 200);

    if (nome.length < 2) return json({ error: "Informe seu nome" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Informe um e-mail válido" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    await admin.from("leads_portal").insert({
      nome, email, telefone: telefone || null, empresa: empresa || null,
      mensagem: "Acessou o ambiente de demonstração", origem: "demo",
    });

    const tenantId = await ensureTenant(admin);
    const password = randomPassword();

    const { data: profile } = await admin.from("profiles").select("id").eq("email", DEMO_EMAIL).maybeSingle();
    let userId = profile?.id as string | undefined;
    if (userId) {
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) throw error;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL, password, email_confirm: true,
        user_metadata: { nome: "Usuário Demonstração", tenant_id: tenantId, role: "gerente" },
      });
      if (error) throw error;
      userId = data.user.id;
    }

    const { data: granja } = await admin.from("granjas").select("id").eq("tenant_id", tenantId).limit(1).maybeSingle();
    await admin.from("profiles").update({
      tenant_id: tenantId, ativo: true, is_super_admin_original: false, granja_id: granja?.id ?? null,
    }).eq("id", userId);

    // Papel fixo: gerente da empresa demo (nunca admin nem super admin)
    await admin.from("user_roles").delete().eq("user_id", userId).neq("role", "gerente");
    const { data: role } = await admin.from("user_roles").select("id").eq("user_id", userId).eq("role", "gerente").maybeSingle();
    if (!role) await admin.from("user_roles").insert({ user_id: userId, role: "gerente" });

    return json({ email: DEMO_EMAIL, password });
  } catch (err) {
    console.error("start-demo error:", err);
    return json({ error: "Não foi possível abrir a demonstração agora." }, 500);
  }
});
