import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ViaCepResp {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

interface BrasilApiCnpjResp {
  logradouro?: string;
  descricao_tipo_de_logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}

async function lookupCep(cep: string): Promise<ViaCepResp | null> {
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!r.ok) return null;
    const data = (await r.json()) as ViaCepResp;
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

async function lookupCnpj(cnpj: string): Promise<BrasilApiCnpjResp | null> {
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!r.ok) return null;
    return (await r.json()) as BrasilApiCnpjResp;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dryRun: boolean = !!body.dry_run;
    const limit: number | undefined = typeof body.limit === "number" ? body.limit : undefined;
    const tenantId: string | undefined = body.tenant_id;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verifica usuário autenticado
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar role (admin ou gerente)
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const allowedRoles = (rolesData || []).some((r: { role: string }) =>
      ["admin", "gerente"].includes(r.role),
    );
    if (!allowedRoles) {
      return new Response(JSON.stringify({ error: "Permissão insuficiente" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar tenant ownership
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("tenant_id, is_super_admin_original")
      .eq("id", userData.user.id)
      .maybeSingle();
    const callerTenantId = callerProfile?.tenant_id ?? null;
    const isSuper = !!callerProfile?.is_super_admin_original;

    // Se não for super admin, força o tenant do usuário
    const effectiveTenantId = isSuper ? tenantId : callerTenantId;
    if (!isSuper && tenantId && tenantId !== callerTenantId) {
      return new Response(JSON.stringify({ error: "Acesso negado a outro tenant" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let q = supabase
      .from("clientes_fornecedores")
      .select("id, cep, cpf_cnpj, cidade, uf, logradouro, bairro, complemento, tenant_id")
      .or("cidade.is.null,cidade.eq.")
      .order("nome", { ascending: true });

    if (effectiveTenantId) q = q.eq("tenant_id", effectiveTenantId);
    if (limit) q = q.limit(limit);
    else q = q.limit(5000);

    const { data: registros, error } = await q;
    if (error) throw error;

    const stats = {
      total_candidatos: registros?.length || 0,
      atualizados: 0,
      via_cep: 0,
      via_cnpj: 0,
      sem_fonte: 0,
      cep_nao_encontrado: 0,
      cnpj_nao_encontrado: 0,
      erros: 0,
    };

    const naoResolvidos: { id: string; motivo: string }[] = [];

    for (const reg of registros || []) {
      try {
        const cepLimpo = (reg.cep || "").replace(/\D/g, "");
        const cnpjLimpo = (reg.cpf_cnpj || "").replace(/\D/g, "");

        let novosCampos: Record<string, string | null> = {};
        let usouFonte: "cep" | "cnpj" | null = null;

        if (cepLimpo.length === 8) {
          await sleep(150);
          const v = await lookupCep(cepLimpo);
          if (v && v.localidade && v.uf) {
            novosCampos = {
              cidade: v.localidade,
              uf: v.uf,
              logradouro: reg.logradouro || v.logradouro || null,
              bairro: reg.bairro || v.bairro || null,
            };
            usouFonte = "cep";
            stats.via_cep++;
          } else {
            stats.cep_nao_encontrado++;
          }
        }

        if (!usouFonte && cnpjLimpo.length === 14) {
          await sleep(250); // BrasilAPI tem rate-limit mais sensível
          const c = await lookupCnpj(cnpjLimpo);
          if (c && c.municipio && c.uf) {
            const logradouroMontado = [c.descricao_tipo_de_logradouro, c.logradouro]
              .filter(Boolean)
              .join(" ")
              .trim();
            novosCampos = {
              cidade: c.municipio,
              uf: c.uf,
              logradouro: reg.logradouro || logradouroMontado || null,
              bairro: reg.bairro || c.bairro || null,
              complemento: reg.complemento || c.complemento || null,
              cep:
                reg.cep ||
                (c.cep ? c.cep.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2") : null),
            };
            usouFonte = "cnpj";
            stats.via_cnpj++;
          } else {
            stats.cnpj_nao_encontrado++;
          }
        }

        if (!usouFonte) {
          if (cepLimpo.length !== 8 && cnpjLimpo.length !== 14) {
            stats.sem_fonte++;
            naoResolvidos.push({ id: reg.id, motivo: "sem CEP nem CNPJ utilizáveis" });
          } else {
            naoResolvidos.push({
              id: reg.id,
              motivo: cepLimpo.length === 8 ? "CEP não encontrado" : "CNPJ não encontrado",
            });
          }
          continue;
        }

        // Remove chaves vazias
        Object.keys(novosCampos).forEach((k) => {
          if (novosCampos[k] === "" || novosCampos[k] === undefined) delete novosCampos[k];
        });

        if (!dryRun && Object.keys(novosCampos).length > 0) {
          const { error: upErr } = await supabase
            .from("clientes_fornecedores")
            .update(novosCampos)
            .eq("id", reg.id);
          if (upErr) {
            stats.erros++;
            naoResolvidos.push({ id: reg.id, motivo: `erro update: ${upErr.message}` });
            continue;
          }
        }
        stats.atualizados++;
      } catch (e) {
        stats.erros++;
        naoResolvidos.push({ id: reg.id, motivo: `exceção: ${(e as Error).message}` });
      }
    }

    return new Response(
      JSON.stringify({
        dry_run: dryRun,
        stats,
        nao_resolvidos_amostra: naoResolvidos.slice(0, 50),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("enriquecer-clientes-fornecedores erro:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
