// Shared tenant-isolation helpers for NFe edge functions.
// Returned objects use { ok: boolean, status?, error? } so callers can short-circuit.

// deno-lint-ignore no-explicit-any
type Admin = any;

export interface CallerTenant {
  userId: string;
  tenantId: string | null;
  isSuper: boolean;
}

export async function getCallerTenant(
  admin: Admin,
  userId: string,
): Promise<CallerTenant> {
  const { data } = await admin
    .from("profiles")
    .select("tenant_id, is_super_admin_original")
    .eq("id", userId)
    .maybeSingle();
  return {
    userId,
    tenantId: (data?.tenant_id as string | null) ?? null,
    isSuper: !!data?.is_super_admin_original,
  };
}

export async function assertNotaFiscalTenant(
  admin: Admin,
  notaFiscalId: string,
  caller: CallerTenant,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data } = await admin
    .from("notas_fiscais")
    .select("tenant_id")
    .eq("id", notaFiscalId)
    .maybeSingle();
  if (!data) return { ok: false, status: 404, error: "Nota fiscal não encontrada" };
  if (caller.isSuper) return { ok: true };
  if (data.tenant_id && data.tenant_id === caller.tenantId) return { ok: true };
  return { ok: false, status: 403, error: "Sem permissão para acessar essa nota fiscal" };
}

export async function assertEmitenteTenant(
  admin: Admin,
  emitenteId: string,
  caller: CallerTenant,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (caller.isSuper) return { ok: true };
  const { data } = await admin
    .from("emitentes_nfe")
    .select("granja_id, granjas:granja_id(tenant_id)")
    .eq("id", emitenteId)
    .maybeSingle();
  if (!data) return { ok: false, status: 404, error: "Emitente não encontrado" };
  // deno-lint-ignore no-explicit-any
  const t = (data as any).granjas?.tenant_id ?? null;
  if (t && t === caller.tenantId) return { ok: true };
  return { ok: false, status: 403, error: "Sem permissão para acessar esse emitente" };
}

export async function assertInscricaoTenant(
  admin: Admin,
  inscricaoId: string,
  caller: CallerTenant,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (caller.isSuper) return { ok: true };
  const { data } = await admin
    .from("inscricoes_produtor")
    .select("granja_id, granjas:granja_id(tenant_id)")
    .eq("id", inscricaoId)
    .maybeSingle();
  if (!data) return { ok: false, status: 404, error: "Inscrição não encontrada" };
  // deno-lint-ignore no-explicit-any
  const t = (data as any).granjas?.tenant_id ?? null;
  if (t && t === caller.tenantId) return { ok: true };
  return { ok: false, status: 403, error: "Sem permissão para acessar essa inscrição" };
}

export function tenantErrorResponse(
  result: { ok: false; status: number; error: string },
  corsHeaders: Record<string, string>,
) {
  return new Response(
    JSON.stringify({ success: false, error: result.error }),
    { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
