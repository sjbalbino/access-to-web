
-- Adiciona tenant_id em contratos_venda e remessas_venda
ALTER TABLE public.contratos_venda ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.remessas_venda ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- Backfill: contratos com granja → tenant da granja; sem granja → GRINGS
UPDATE public.contratos_venda cv
SET tenant_id = g.tenant_id
FROM public.granjas g
WHERE cv.granja_id = g.id AND cv.tenant_id IS NULL;

UPDATE public.contratos_venda
SET tenant_id = '1b4c4628-e7cd-4bc3-8881-ed6fa9c8a51e'
WHERE tenant_id IS NULL;

-- Backfill remessas a partir do contrato
UPDATE public.remessas_venda rv
SET tenant_id = cv.tenant_id
FROM public.contratos_venda cv
WHERE rv.contrato_venda_id = cv.id AND rv.tenant_id IS NULL;

-- Remessas sem contrato → GRINGS (fallback seguro)
UPDATE public.remessas_venda
SET tenant_id = '1b4c4628-e7cd-4bc3-8881-ed6fa9c8a51e'
WHERE tenant_id IS NULL;

-- DEFAULT para inserts futuros
ALTER TABLE public.contratos_venda ALTER COLUMN tenant_id SET DEFAULT get_user_tenant_id();
ALTER TABLE public.remessas_venda ALTER COLUMN tenant_id SET DEFAULT get_user_tenant_id();

-- Índices
CREATE INDEX IF NOT EXISTS contratos_venda_tenant_idx ON public.contratos_venda(tenant_id);
CREATE INDEX IF NOT EXISTS remessas_venda_tenant_idx ON public.remessas_venda(tenant_id);

-- Drop policies antigas
DROP POLICY IF EXISTS "Usuários veem contratos do seu tenant" ON public.contratos_venda;
DROP POLICY IF EXISTS "Operadores e admins podem inserir contratos" ON public.contratos_venda;
DROP POLICY IF EXISTS "Operadores e admins podem atualizar contratos" ON public.contratos_venda;
DROP POLICY IF EXISTS "Operadores e admins podem excluir contratos" ON public.contratos_venda;

DROP POLICY IF EXISTS "Usuários veem remessas do seu tenant" ON public.remessas_venda;
DROP POLICY IF EXISTS "Operadores podem inserir remessas" ON public.remessas_venda;
DROP POLICY IF EXISTS "Operadores podem atualizar remessas" ON public.remessas_venda;
DROP POLICY IF EXISTS "Operadores podem excluir remessas" ON public.remessas_venda;

-- Novas policies baseadas em tenant_id direto
CREATE POLICY tenant_select_contratos_venda ON public.contratos_venda FOR SELECT
  USING (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));
CREATE POLICY tenant_insert_contratos_venda ON public.contratos_venda FOR INSERT
  WITH CHECK (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND tenant_id IS NOT NULL)));
CREATE POLICY tenant_update_contratos_venda ON public.contratos_venda FOR UPDATE
  USING (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)));
CREATE POLICY tenant_delete_contratos_venda ON public.contratos_venda FOR DELETE
  USING (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)));

CREATE POLICY tenant_select_remessas_venda ON public.remessas_venda FOR SELECT
  USING (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));
CREATE POLICY tenant_insert_remessas_venda ON public.remessas_venda FOR INSERT
  WITH CHECK (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND tenant_id IS NOT NULL)));
CREATE POLICY tenant_update_remessas_venda ON public.remessas_venda FOR UPDATE
  USING (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)));
CREATE POLICY tenant_delete_remessas_venda ON public.remessas_venda FOR DELETE
  USING (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)));
