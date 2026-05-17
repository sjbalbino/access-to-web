
-- Isolar por tenant: culturas, unidades_medida, sub_centros_custo
-- Sem seed; tenants existentes (UMBU, etc.) começam vazios.

-- 1. Coluna tenant_id
ALTER TABLE public.culturas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.unidades_medida ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.sub_centros_custo ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 2. Backfill dos registros existentes para AGROPECUARIA GRINGS
UPDATE public.culturas SET tenant_id = '1b4c4628-e7cd-4bc3-8881-ed6fa9c8a51e' WHERE tenant_id IS NULL;
UPDATE public.unidades_medida SET tenant_id = '1b4c4628-e7cd-4bc3-8881-ed6fa9c8a51e' WHERE tenant_id IS NULL;
UPDATE public.sub_centros_custo SET tenant_id = '1b4c4628-e7cd-4bc3-8881-ed6fa9c8a51e' WHERE tenant_id IS NULL;

-- 3. DEFAULT para inserts futuros usarem o tenant do usuário automaticamente
ALTER TABLE public.culturas ALTER COLUMN tenant_id SET DEFAULT get_user_tenant_id();
ALTER TABLE public.unidades_medida ALTER COLUMN tenant_id SET DEFAULT get_user_tenant_id();
ALTER TABLE public.sub_centros_custo ALTER COLUMN tenant_id SET DEFAULT get_user_tenant_id();

-- 4. Substituir UNIQUE global de codigo por índice parcial por tenant
ALTER TABLE public.culturas DROP CONSTRAINT IF EXISTS culturas_codigo_key;
ALTER TABLE public.unidades_medida DROP CONSTRAINT IF EXISTS unidades_medida_codigo_key;
CREATE UNIQUE INDEX IF NOT EXISTS culturas_tenant_codigo_uniq ON public.culturas(tenant_id, codigo) WHERE codigo IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unidades_medida_tenant_codigo_uniq ON public.unidades_medida(tenant_id, codigo) WHERE codigo IS NOT NULL;

-- 5. Índices de performance
CREATE INDEX IF NOT EXISTS culturas_tenant_idx ON public.culturas(tenant_id);
CREATE INDEX IF NOT EXISTS unidades_medida_tenant_idx ON public.unidades_medida(tenant_id);
CREATE INDEX IF NOT EXISTS sub_centros_custo_tenant_idx ON public.sub_centros_custo(tenant_id);

-- 6. Reescrever policies (drop antigas)
DROP POLICY IF EXISTS "Permitir leitura pública de culturas" ON public.culturas;
DROP POLICY IF EXISTS "Operadores e admins podem inserir culturas" ON public.culturas;
DROP POLICY IF EXISTS "Operadores e admins podem atualizar culturas" ON public.culturas;
DROP POLICY IF EXISTS "Operadores e admins podem excluir culturas" ON public.culturas;

DROP POLICY IF EXISTS "Permitir leitura pública de unidades_medida" ON public.unidades_medida;
DROP POLICY IF EXISTS "Operadores e admins podem inserir unidades_medida" ON public.unidades_medida;
DROP POLICY IF EXISTS "Operadores e admins podem atualizar unidades_medida" ON public.unidades_medida;
DROP POLICY IF EXISTS "Operadores e admins podem excluir unidades_medida" ON public.unidades_medida;

DROP POLICY IF EXISTS "Permitir leitura pública sub_centros" ON public.sub_centros_custo;
DROP POLICY IF EXISTS "Operadores podem inserir sub_centros" ON public.sub_centros_custo;
DROP POLICY IF EXISTS "Operadores podem atualizar sub_centros" ON public.sub_centros_custo;
DROP POLICY IF EXISTS "Operadores podem excluir sub_centros" ON public.sub_centros_custo;

-- 7. Policies novas isoladas por tenant (com bypass do super admin sem tenant selecionado)
CREATE POLICY tenant_select_culturas ON public.culturas FOR SELECT
  USING (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));
CREATE POLICY tenant_insert_culturas ON public.culturas FOR INSERT
  WITH CHECK (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND tenant_id IS NOT NULL)));
CREATE POLICY tenant_update_culturas ON public.culturas FOR UPDATE
  USING (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)));
CREATE POLICY tenant_delete_culturas ON public.culturas FOR DELETE
  USING (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)));

CREATE POLICY tenant_select_unidades_medida ON public.unidades_medida FOR SELECT
  USING (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));
CREATE POLICY tenant_insert_unidades_medida ON public.unidades_medida FOR INSERT
  WITH CHECK (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND tenant_id IS NOT NULL)));
CREATE POLICY tenant_update_unidades_medida ON public.unidades_medida FOR UPDATE
  USING (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)));
CREATE POLICY tenant_delete_unidades_medida ON public.unidades_medida FOR DELETE
  USING (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)));

CREATE POLICY tenant_select_sub_centros_custo ON public.sub_centros_custo FOR SELECT
  USING (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));
CREATE POLICY tenant_insert_sub_centros_custo ON public.sub_centros_custo FOR INSERT
  WITH CHECK (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND tenant_id IS NOT NULL)));
CREATE POLICY tenant_update_sub_centros_custo ON public.sub_centros_custo FOR UPDATE
  USING (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)));
CREATE POLICY tenant_delete_sub_centros_custo ON public.sub_centros_custo FOR DELETE
  USING (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)));

-- 8. Desativar seed automático para novos tenants (usuário prefere começar vazio)
DROP TRIGGER IF EXISTS tenants_seed_defaults ON public.tenants;
DROP TRIGGER IF EXISTS trg_seed_tenant_defaults ON public.tenants;
