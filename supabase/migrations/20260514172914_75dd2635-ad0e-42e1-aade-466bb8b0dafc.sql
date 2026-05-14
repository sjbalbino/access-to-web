
-- 1) Fix colheitas: remove public SELECT, scope by tenant via controle_lavoura -> lavoura -> granja
DROP POLICY IF EXISTS "Permitir leitura pública de colheitas" ON public.colheitas;
DROP POLICY IF EXISTS "Operadores e admins podem inserir colheitas" ON public.colheitas;
DROP POLICY IF EXISTS "Operadores e admins podem atualizar colheitas" ON public.colheitas;
DROP POLICY IF EXISTS "Operadores e admins podem excluir colheitas" ON public.colheitas;

CREATE POLICY "Usuários veem colheitas do seu tenant"
  ON public.colheitas FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.controle_lavouras cl
      JOIN public.lavouras l ON l.id = cl.lavoura_id
      WHERE cl.id = colheitas.controle_lavoura_id
        AND public.granja_belongs_to_tenant(l.granja_id)
    )
  );

CREATE POLICY "Operadores podem inserir colheitas"
  ON public.colheitas FOR INSERT TO authenticated
  WITH CHECK (
    public.can_edit(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.controle_lavouras cl
      JOIN public.lavouras l ON l.id = cl.lavoura_id
      WHERE cl.id = colheitas.controle_lavoura_id
        AND public.granja_belongs_to_tenant(l.granja_id)
    )
  );

CREATE POLICY "Operadores podem atualizar colheitas"
  ON public.colheitas FOR UPDATE TO authenticated
  USING (
    public.can_edit(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.controle_lavouras cl
      JOIN public.lavouras l ON l.id = cl.lavoura_id
      WHERE cl.id = colheitas.controle_lavoura_id
        AND public.granja_belongs_to_tenant(l.granja_id)
    )
  );

CREATE POLICY "Operadores podem excluir colheitas"
  ON public.colheitas FOR DELETE TO authenticated
  USING (
    public.can_edit(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.controle_lavouras cl
      JOIN public.lavouras l ON l.id = cl.lavoura_id
      WHERE cl.id = colheitas.controle_lavoura_id
        AND public.granja_belongs_to_tenant(l.granja_id)
    )
  );

-- 2) profiles: block direct INSERT from clients (signup trigger uses SECURITY DEFINER)
CREATE POLICY "Profile inserts are blocked at API level"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (false);

-- 3) Restrict all permissive policies on sensitive tables from {public} to {authenticated}
DO $$
DECLARE
  r RECORD;
  tables TEXT[] := ARRAY[
    'produtos','contratos_venda','produtores','inscricoes_produtor',
    'clientes_fornecedores','locais_entrega','transportadoras','remessas_venda',
    'notas_fiscais','granjas','lavouras','silos','placas','estoque_produtos',
    'compras_cereais','emitentes_nfe','devolucoes_deposito',
    'transferencias_deposito','notas_deposito_emitidas','tenants'
  ];
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY(tables)
      AND 'public' = ANY(roles)
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated',
                   r.policyname, r.tablename);
  END LOOP;
END $$;
