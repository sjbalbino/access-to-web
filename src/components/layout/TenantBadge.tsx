import { Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenants } from "@/hooks/useTenants";

interface TenantBadgeProps {
  compact?: boolean;
}

export function TenantBadge({ compact = false }: TenantBadgeProps) {
  const { profile, isSuperAdmin } = useAuth();
  const { data: tenants = [] } = useTenants();

  const tenant = profile?.tenant_id
    ? tenants.find((t) => t.id === profile.tenant_id)
    : null;

  const nome = tenant
    ? tenant.nome_fantasia || tenant.razao_social
    : isSuperAdmin
    ? "Super Admin (sem empresa)"
    : null;

  if (!nome) return null;

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 max-w-[260px]"
      title={tenant ? `${tenant.razao_social}` : nome}
    >
      <Building2 className="h-3.5 w-3.5 shrink-0" />
      <span className={`font-semibold truncate ${compact ? "text-xs" : "text-sm"}`}>
        {nome}
      </span>
    </div>
  );
}
