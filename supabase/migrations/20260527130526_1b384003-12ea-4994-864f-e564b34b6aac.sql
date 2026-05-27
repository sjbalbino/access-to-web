
-- Fix: cp_delete tenant scoping
DROP POLICY IF EXISTS cp_delete ON public.contas_pagar;
CREATE POLICY cp_delete ON public.contas_pagar
FOR DELETE TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  AND granja_belongs_to_tenant(granja_id)
);

-- Fix: cr_delete tenant scoping
DROP POLICY IF EXISTS cr_delete ON public.contas_receber;
CREATE POLICY cr_delete ON public.contas_receber
FOR DELETE TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  AND granja_belongs_to_tenant(granja_id)
);

-- Fix: granjas with null tenant_id should only be accessible to super admins
DROP POLICY IF EXISTS "Usuários veem granjas do seu tenant" ON public.granjas;
CREATE POLICY "Usuários veem granjas do seu tenant" ON public.granjas
FOR SELECT TO authenticated
USING (
  (tenant_id = get_user_tenant_id())
  OR (is_super_admin(auth.uid()) AND (tenant_id IS NULL OR get_user_tenant_id() IS NULL))
);

DROP POLICY IF EXISTS "Operadores e admins podem inserir granjas" ON public.granjas;
CREATE POLICY "Operadores e admins podem inserir granjas" ON public.granjas
FOR INSERT TO authenticated
WITH CHECK (
  can_edit(auth.uid()) AND (
    (tenant_id = get_user_tenant_id())
    OR (is_super_admin(auth.uid()) AND (tenant_id IS NULL OR get_user_tenant_id() IS NULL))
  )
);

DROP POLICY IF EXISTS "Operadores e admins podem atualizar granjas" ON public.granjas;
CREATE POLICY "Operadores e admins podem atualizar granjas" ON public.granjas
FOR UPDATE TO authenticated
USING (
  can_edit(auth.uid()) AND (
    (tenant_id = get_user_tenant_id())
    OR (is_super_admin(auth.uid()) AND (tenant_id IS NULL OR get_user_tenant_id() IS NULL))
  )
);

DROP POLICY IF EXISTS "Operadores e admins podem excluir granjas" ON public.granjas;
CREATE POLICY "Operadores e admins podem excluir granjas" ON public.granjas
FOR DELETE TO authenticated
USING (
  can_edit(auth.uid()) AND (
    (tenant_id = get_user_tenant_id())
    OR (is_super_admin(auth.uid()) AND (tenant_id IS NULL OR get_user_tenant_id() IS NULL))
  )
);

-- Fix: profiles SELECT restricted to self, same-tenant admins, or super admins
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Users view profiles in their tenant" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR is_super_admin(auth.uid())
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND tenant_id IS NOT DISTINCT FROM get_user_tenant_id()
  )
);

-- Fix: user_roles SELECT restricted to self, same-tenant admins, or super admins
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;
CREATE POLICY "Users view their own role or admins view tenant roles" ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR is_super_admin(auth.uid())
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id
        AND p.tenant_id IS NOT DISTINCT FROM get_user_tenant_id()
    )
  )
);
