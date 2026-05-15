-- Tornar bypass de super admin condicional: só vê tudo quando NÃO há tenant ativo selecionado

CREATE OR REPLACE FUNCTION public.granja_belongs_to_tenant(_granja_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.granjas
    WHERE id = _granja_id AND (tenant_id = get_user_tenant_id() OR tenant_id IS NULL)
  )
  OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)
  OR _granja_id IS NULL
$function$;

-- Atualizar políticas da tabela granjas
DROP POLICY IF EXISTS "Usuários veem granjas do seu tenant" ON public.granjas;
CREATE POLICY "Usuários veem granjas do seu tenant"
ON public.granjas FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)
  OR tenant_id IS NULL
);

DROP POLICY IF EXISTS "Operadores e admins podem inserir granjas" ON public.granjas;
CREATE POLICY "Operadores e admins podem inserir granjas"
ON public.granjas FOR INSERT
TO authenticated
WITH CHECK (
  can_edit(auth.uid()) AND (
    tenant_id = get_user_tenant_id()
    OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)
    OR tenant_id IS NULL
  )
);

DROP POLICY IF EXISTS "Operadores e admins podem atualizar granjas" ON public.granjas;
CREATE POLICY "Operadores e admins podem atualizar granjas"
ON public.granjas FOR UPDATE
TO authenticated
USING (
  can_edit(auth.uid()) AND (
    tenant_id = get_user_tenant_id()
    OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)
    OR tenant_id IS NULL
  )
);

DROP POLICY IF EXISTS "Operadores e admins podem excluir granjas" ON public.granjas;
CREATE POLICY "Operadores e admins podem excluir granjas"
ON public.granjas FOR DELETE
TO authenticated
USING (
  can_edit(auth.uid()) AND (
    tenant_id = get_user_tenant_id()
    OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)
    OR tenant_id IS NULL
  )
);