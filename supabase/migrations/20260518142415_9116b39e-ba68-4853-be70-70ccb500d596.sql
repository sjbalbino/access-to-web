
-- 1. Add tenant_id column
ALTER TABLE public.clientes_fornecedores ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 2. Populate tenant_id from current granja
UPDATE public.clientes_fornecedores cf
SET tenant_id = g.tenant_id
FROM public.granjas g
WHERE cf.granja_id = g.id AND cf.tenant_id IS NULL;

-- 3. For any remaining nulls, fallback to first active tenant
UPDATE public.clientes_fornecedores
SET tenant_id = (SELECT id FROM public.tenants WHERE ativo = true ORDER BY created_at LIMIT 1)
WHERE tenant_id IS NULL;

-- 4. Enforce NOT NULL
ALTER TABLE public.clientes_fornecedores ALTER COLUMN tenant_id SET NOT NULL;

-- 5. Drop old RLS policies
DROP POLICY IF EXISTS "Operadores e admins podem atualizar clientes_fornecedores" ON public.clientes_fornecedores;
DROP POLICY IF EXISTS "Operadores e admins podem excluir clientes_fornecedores" ON public.clientes_fornecedores;
DROP POLICY IF EXISTS "Operadores e admins podem inserir clientes_fornecedores" ON public.clientes_fornecedores;
DROP POLICY IF EXISTS "Usuários veem clientes_fornecedores do seu tenant" ON public.clientes_fornecedores;

-- 6. New tenant-based RLS policies
CREATE POLICY "Usuários veem clientes_fornecedores do seu tenant"
  ON public.clientes_fornecedores FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

CREATE POLICY "Operadores e admins podem inserir clientes_fornecedores"
  ON public.clientes_fornecedores FOR INSERT TO authenticated
  WITH CHECK (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)));

CREATE POLICY "Operadores e admins podem atualizar clientes_fornecedores"
  ON public.clientes_fornecedores FOR UPDATE TO authenticated
  USING (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)));

CREATE POLICY "Operadores e admins podem excluir clientes_fornecedores"
  ON public.clientes_fornecedores FOR DELETE TO authenticated
  USING (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)));

-- 7. Trigger to auto-fill tenant_id from logged-in user
CREATE OR REPLACE FUNCTION public.set_clientes_fornecedores_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := get_user_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_clientes_fornecedores_tenant ON public.clientes_fornecedores;
CREATE TRIGGER trg_set_clientes_fornecedores_tenant
  BEFORE INSERT ON public.clientes_fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.set_clientes_fornecedores_tenant();
