import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UsuarioPendente {
  id: string;
  nome: string | null;
  email: string | null;
  tenant_id: string | null;
  tenant_nome?: string | null;
  created_at: string;
}

export function useUsuariosPendentes() {
  const { isAdmin, isSuperAdmin, profile } = useAuth();

  return useQuery({
    queryKey: ["usuarios-pendentes", isSuperAdmin, profile?.tenant_id],
    enabled: isAdmin,
    queryFn: async (): Promise<UsuarioPendente[]> => {
      // Pendentes = profiles ativos=false E sem linha em user_roles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, nome, email, tenant_id, created_at, ativo")
        .eq("ativo", false)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: roles } = await supabase.from("user_roles").select("user_id");
      const usersWithRole = new Set((roles || []).map((r: any) => r.user_id));

      let pendentes = (profiles || []).filter((p) => !usersWithRole.has(p.id));

      // Admin comum vê apenas pendentes do próprio tenant + sem tenant
      if (!isSuperAdmin) {
        pendentes = pendentes.filter(
          (p) => p.tenant_id === null || p.tenant_id === profile?.tenant_id
        );
      }

      // Resolve nome dos tenants
      const tenantIds = [...new Set(pendentes.map((p) => p.tenant_id).filter(Boolean))];
      let tenantsMap: Record<string, string> = {};
      if (tenantIds.length > 0) {
        const { data: tenants } = await supabase
          .from("tenants").select("id, razao_social, nome_fantasia").in("id", tenantIds as string[]);
        tenantsMap = Object.fromEntries(
          (tenants || []).map((t: any) => [t.id, t.nome_fantasia || t.razao_social])
        );
      }

      return pendentes.map((p) => ({
        ...p,
        tenant_nome: p.tenant_id ? tenantsMap[p.tenant_id] || null : null,
      }));
    },
  });
}
