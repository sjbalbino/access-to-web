-- 1) Super admin inserts must target an existing tenant
DROP POLICY IF EXISTS tenant_insert_contratos_venda ON public.contratos_venda;
CREATE POLICY tenant_insert_contratos_venda ON public.contratos_venda
FOR INSERT TO authenticated
WITH CHECK (
  can_edit(auth.uid()) AND (
    tenant_id = get_user_tenant_id()
    OR (
      is_super_admin(auth.uid())
      AND tenant_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = contratos_venda.tenant_id)
    )
  )
);

DROP POLICY IF EXISTS tenant_insert_remessas_venda ON public.remessas_venda;
CREATE POLICY tenant_insert_remessas_venda ON public.remessas_venda
FOR INSERT TO authenticated
WITH CHECK (
  can_edit(auth.uid()) AND (
    tenant_id = get_user_tenant_id()
    OR (
      is_super_admin(auth.uid())
      AND tenant_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = remessas_venda.tenant_id)
    )
  )
);

DROP POLICY IF EXISTS tenant_insert_sub_centros_custo ON public.sub_centros_custo;
CREATE POLICY tenant_insert_sub_centros_custo ON public.sub_centros_custo
FOR INSERT TO authenticated
WITH CHECK (
  can_edit(auth.uid()) AND (
    tenant_id = get_user_tenant_id()
    OR (
      is_super_admin(auth.uid())
      AND tenant_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = sub_centros_custo.tenant_id)
    )
  )
);

DROP POLICY IF EXISTS tenant_insert_unidades_medida ON public.unidades_medida;
CREATE POLICY tenant_insert_unidades_medida ON public.unidades_medida
FOR INSERT TO authenticated
WITH CHECK (
  can_edit(auth.uid()) AND (
    tenant_id = get_user_tenant_id()
    OR (
      is_super_admin(auth.uid())
      AND tenant_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = unidades_medida.tenant_id)
    )
  )
);

DROP POLICY IF EXISTS tenant_insert_culturas ON public.culturas;
CREATE POLICY tenant_insert_culturas ON public.culturas
FOR INSERT TO authenticated
WITH CHECK (
  can_edit(auth.uid()) AND (
    tenant_id = get_user_tenant_id()
    OR (
      is_super_admin(auth.uid())
      AND tenant_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = culturas.tenant_id)
    )
  )
);

-- 2) Remove redundant SELECT policy on granjas
DROP POLICY IF EXISTS tenant_select_granjas ON public.granjas;
