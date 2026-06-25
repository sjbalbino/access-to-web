## Causa raiz

O `tenant-guard` das edge functions (`focus-nfe-emitir`, `focus-nfe-download`, `focus-nfe-cancelar`, `focus-nfe-carta-correcao`, `focus-nfe-consultar`, `focus-nfe-enviar-email`) faz:

```ts
if (caller.isSuper) return { ok: true };
if (data.tenant_id && data.tenant_id === caller.tenantId) return { ok: true };
return 403;
```

Consulta no banco confirma:
- Fernando é `admin`, tenant `72db48ef…`, `is_super_admin_original=false`.
- **Todas as 42 notas em `notas_fiscais` têm `tenant_id = NULL`** (a granja tem o tenant correto, mas a nota não).

Resultado: super admin passa pelo bypass; Fernando recebe 403 → frontend mostra "Edge Function returned a non-2xx status code". Mesmo problema em emissão, download de DANFE/XML, cancelamento, etc.

## Correção

### 1. Backfill `notas_fiscais.tenant_id` a partir da granja (migration)

```sql
UPDATE public.notas_fiscais nf
SET tenant_id = g.tenant_id
FROM public.granjas g
WHERE nf.granja_id = g.id
  AND nf.tenant_id IS NULL;
```

### 2. Garantir preenchimento futuro

Adicionar trigger `BEFORE INSERT OR UPDATE` em `notas_fiscais` que, se `tenant_id IS NULL`, copia de `granjas.tenant_id` pelo `granja_id`.

### 3. Tornar o tenant-guard resiliente

Em `supabase/functions/_shared/tenant-guard.ts`, `assertNotaFiscalTenant` passa a fazer fallback para o tenant da granja quando `notas_fiscais.tenant_id` for nulo:

```ts
const { data } = await admin
  .from("notas_fiscais")
  .select("tenant_id, granja_id, granjas:granja_id(tenant_id)")
  .eq("id", notaFiscalId)
  .maybeSingle();
const notaTenant = data?.tenant_id ?? data?.granjas?.tenant_id ?? null;
```

Assim mesmo notas legadas sem `tenant_id` deixam usuários do tenant correto operarem, sem afrouxar isolamento.

## Verificação

- Rodar a migration → conferir `SELECT COUNT(*) FROM notas_fiscais WHERE tenant_id IS NULL` = 0.
- Fernando reemitir a Remessa #30 e baixar a DANFE.
