
-- Fix 1: user_roles INSERT/UPDATE/DELETE policies must scope to caller's tenant
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles in their tenant"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin(auth.uid())
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id
        AND p.tenant_id IS NOT DISTINCT FROM get_user_tenant_id()
        AND get_user_tenant_id() IS NOT NULL
    )
  )
);

CREATE POLICY "Admins can update roles in their tenant"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id
        AND p.tenant_id IS NOT DISTINCT FROM get_user_tenant_id()
        AND get_user_tenant_id() IS NOT NULL
    )
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id
        AND p.tenant_id IS NOT DISTINCT FROM get_user_tenant_id()
        AND get_user_tenant_id() IS NOT NULL
    )
  )
);

CREATE POLICY "Admins can delete roles in their tenant"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id
        AND p.tenant_id IS NOT DISTINCT FROM get_user_tenant_id()
        AND get_user_tenant_id() IS NOT NULL
    )
  )
);

-- Fix 2: profiles UPDATE by admin must be scoped to same tenant and must not allow
-- escalating is_super_admin_original. Only the super admin original may toggle that flag.
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Admins can update profiles in their tenant"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND tenant_id IS NOT DISTINCT FROM get_user_tenant_id()
    AND get_user_tenant_id() IS NOT NULL
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND tenant_id IS NOT DISTINCT FROM get_user_tenant_id()
    AND get_user_tenant_id() IS NOT NULL
    AND is_super_admin_original = false
  )
);

-- Fix 3: granja_belongs_to_tenant() must not return TRUE for NULL granja_id to
-- non-super-admins. Restrict the NULL bypass to super admins without a tenant only.
CREATE OR REPLACE FUNCTION public.granja_belongs_to_tenant(_granja_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    CASE
      WHEN _granja_id IS NULL THEN
        (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)
      ELSE EXISTS (
        SELECT 1 FROM public.granjas
        WHERE id = _granja_id
          AND (tenant_id = get_user_tenant_id() OR tenant_id IS NULL)
      )
      OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)
    END
$function$;
