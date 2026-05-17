
-- ============================================================
-- 1. Adicionar tenant_id, backfill, índices
-- ============================================================
DO $$
DECLARE
  v_gringa uuid := '1b4c4628-e7cd-4bc3-8881-ed6fa9c8a51e';
  v_table text;
  v_tables text[] := ARRAY[
    'produtos','grupos_produtos','placas','transportadoras','locais_entrega','safras',
    'lavouras','silos','controle_lavouras',
    'plantios','aplicacoes','chuvas','floracoes','insetos','plantas_invasoras','analises_solo','pivos',
    'dre_contas','tabela_umidades','plano_contas_gerencial'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    -- Adicionar coluna se não existir
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id)', v_table);
    -- Backfill
    EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', v_table, v_gringa);
    -- Índice
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(tenant_id)', v_table || '_tenant_id_idx', v_table);
  END LOOP;
END $$;

-- ============================================================
-- 2. Reescrever RLS — drop antigas e criar 4 padrão por tabela
-- ============================================================
DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'produtos','grupos_produtos','placas','transportadoras','locais_entrega','safras',
    'lavouras','silos','controle_lavouras',
    'plantios','aplicacoes','chuvas','floracoes','insetos','plantas_invasoras','analises_solo','pivos',
    'dre_contas','tabela_umidades','plano_contas_gerencial'
  ];
  v_pol record;
  v_expr text := '(tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL))';
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    -- Drop todas as policies existentes da tabela
    FOR v_pol IN
      SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=v_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_pol.policyname, v_table);
    END LOOP;
    -- Garantir RLS habilitada
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    -- SELECT
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING %s',
      'tenant_select_'||v_table, v_table, v_expr);
    -- INSERT
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (can_edit(auth.uid()) AND %s)',
      'tenant_insert_'||v_table, v_table, v_expr);
    -- UPDATE
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (can_edit(auth.uid()) AND %s)',
      'tenant_update_'||v_table, v_table, v_expr);
    -- DELETE
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (can_edit(auth.uid()) AND %s)',
      'tenant_delete_'||v_table, v_table, v_expr);
  END LOOP;
END $$;

-- ============================================================
-- 3. UNIQUE constraints globais → parciais por tenant
-- (apenas onde houver constraint global em codigo)
-- ============================================================
DO $$
DECLARE
  v_table text;
  v_cons record;
  v_tables text[] := ARRAY[
    'produtos','grupos_produtos','placas','transportadoras','locais_entrega','safras',
    'lavouras','silos','controle_lavouras',
    'dre_contas','tabela_umidades','plano_contas_gerencial'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    FOR v_cons IN
      SELECT conname FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = v_table AND c.contype = 'u'
        AND pg_get_constraintdef(c.oid) ~* '\(codigo\)'
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', v_table, v_cons.conname);
      EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I(tenant_id, codigo) WHERE codigo IS NOT NULL',
        v_table||'_tenant_codigo_uniq', v_table);
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 4. Seed automático ao criar tenant
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_tenant_defaults(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template uuid := '1b4c4628-e7cd-4bc3-8881-ed6fa9c8a51e';
BEGIN
  -- Não duplicar se já houver dados
  IF EXISTS (SELECT 1 FROM dre_contas WHERE tenant_id = _tenant_id) THEN
    RETURN;
  END IF;

  -- dre_contas (cópia simples — parent_id ficará NULL pois mapear hierarquia
  -- exigiria tabela temporária; usuário pode reorganizar depois)
  INSERT INTO dre_contas (codigo, descricao, nivel, tipo_saldo, ordem, ativo, tenant_id)
  SELECT codigo, descricao, nivel, tipo_saldo, ordem, ativo, _tenant_id
  FROM dre_contas
  WHERE tenant_id = v_template;

  -- tabela_umidades
  INSERT INTO tabela_umidades
  SELECT gen_random_uuid(), 
         t.cultura_id, t.umidade, t.percentual_desconto, 
         t.created_at, t.updated_at, _tenant_id
  FROM tabela_umidades t
  WHERE t.tenant_id = v_template;

  -- plano_contas_gerencial
  INSERT INTO plano_contas_gerencial (codigo, descricao, tipo, nivel, ativo, ordem, tenant_id)
  SELECT codigo, descricao, tipo, nivel, ativo, ordem, _tenant_id
  FROM plano_contas_gerencial
  WHERE tenant_id = v_template;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_seed_tenant_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM seed_tenant_defaults(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenants_seed_defaults ON public.tenants;
CREATE TRIGGER tenants_seed_defaults
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_seed_tenant_defaults();
