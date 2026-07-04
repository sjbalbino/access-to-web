
DO $$
DECLARE
  r RECORD;
  new_qual TEXT;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, roles, permissive
    FROM pg_policies
    WHERE schemaname='public'
      AND cmd='SELECT'
      AND qual LIKE '%is_super_admin(auth.uid()) AND (get_user_tenant_id() IS NULL)%'
  LOOP
    new_qual := replace(
      r.qual,
      'is_super_admin(auth.uid()) AND (get_user_tenant_id() IS NULL)',
      'is_super_admin(auth.uid())'
    );
    -- also handle variant without spaces/parentheses differences
    new_qual := replace(
      new_qual,
      '(is_super_admin(auth.uid()) AND (tenant_id IS NULL))',
      'is_super_admin(auth.uid())'
    );
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO %s USING (%s)',
      r.policyname,
      r.tablename,
      array_to_string(r.roles, ', '),
      new_qual
    );
  END LOOP;
END $$;
