-- Add granja_id to profiles
ALTER TABLE public.profiles ADD COLUMN granja_id UUID REFERENCES public.granjas(id);

-- Update RLS policies for lavouras to consider granja_id for restricted users
DROP POLICY IF EXISTS "tenant_select_lavouras" ON public.lavouras;
CREATE POLICY "tenant_select_lavouras" ON public.lavouras
FOR SELECT USING (
  (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND (get_user_tenant_id() IS NULL)))
  AND (
    is_super_admin(auth.uid()) OR 
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    (SELECT p.granja_id FROM public.profiles p WHERE p.id = auth.uid()) IS NULL OR 
    granja_id = (SELECT p.granja_id FROM public.profiles p WHERE p.id = auth.uid())
  )
);

DROP POLICY IF EXISTS "tenant_insert_lavouras" ON public.lavouras;
CREATE POLICY "tenant_insert_lavouras" ON public.lavouras
FOR INSERT WITH CHECK (
  can_edit(auth.uid()) 
  AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND (get_user_tenant_id() IS NULL)))
  AND (
    is_super_admin(auth.uid()) OR 
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    (SELECT p.granja_id FROM public.profiles p WHERE p.id = auth.uid()) IS NULL OR 
    granja_id = (SELECT p.granja_id FROM public.profiles p WHERE p.id = auth.uid())
  )
);

DROP POLICY IF EXISTS "tenant_update_lavouras" ON public.lavouras;
CREATE POLICY "tenant_update_lavouras" ON public.lavouras
FOR UPDATE USING (
  can_edit(auth.uid()) 
  AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND (get_user_tenant_id() IS NULL)))
  AND (
    is_super_admin(auth.uid()) OR 
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    (SELECT p.granja_id FROM public.profiles p WHERE p.id = auth.uid()) IS NULL OR 
    granja_id = (SELECT p.granja_id FROM public.profiles p WHERE p.id = auth.uid())
  )
);

DROP POLICY IF EXISTS "tenant_delete_lavouras" ON public.lavouras;
CREATE POLICY "tenant_delete_lavouras" ON public.lavouras
FOR DELETE USING (
  can_edit(auth.uid()) 
  AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND (get_user_tenant_id() IS NULL)))
  AND (
    is_super_admin(auth.uid()) OR 
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    (SELECT p.granja_id FROM public.profiles p WHERE p.id = auth.uid()) IS NULL OR 
    granja_id = (SELECT p.granja_id FROM public.profiles p WHERE p.id = auth.uid())
  )
);

-- Update/Create policies for controle_lavouras
DROP POLICY IF EXISTS "tenant_select_controle_lavouras" ON public.controle_lavouras;
CREATE POLICY "tenant_select_controle_lavouras" ON public.controle_lavouras
FOR SELECT USING (
  (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND (get_user_tenant_id() IS NULL)))
  AND (
    is_super_admin(auth.uid()) OR 
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.lavouras l 
      JOIN public.profiles p ON l.granja_id = p.granja_id 
      WHERE l.id = controle_lavouras.lavoura_id AND p.id = auth.uid()
    ) OR
    (SELECT p.granja_id FROM public.profiles p WHERE p.id = auth.uid()) IS NULL
  )
);

DROP POLICY IF EXISTS "tenant_insert_controle_lavouras" ON public.controle_lavouras;
CREATE POLICY "tenant_insert_controle_lavouras" ON public.controle_lavouras
FOR INSERT WITH CHECK (
  can_edit(auth.uid()) 
  AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND (get_user_tenant_id() IS NULL)))
  AND (
    is_super_admin(auth.uid()) OR 
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.lavouras l 
      JOIN public.profiles p ON l.granja_id = p.granja_id 
      WHERE l.id = controle_lavouras.lavoura_id AND p.id = auth.uid()
    ) OR
    (SELECT p.granja_id FROM public.profiles p WHERE p.id = auth.uid()) IS NULL
  )
);

DROP POLICY IF EXISTS "tenant_update_controle_lavouras" ON public.controle_lavouras;
CREATE POLICY "tenant_update_controle_lavouras" ON public.controle_lavouras
FOR UPDATE USING (
  can_edit(auth.uid()) 
  AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND (get_user_tenant_id() IS NULL)))
  AND (
    is_super_admin(auth.uid()) OR 
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.lavouras l 
      JOIN public.profiles p ON l.granja_id = p.granja_id 
      WHERE l.id = controle_lavouras.lavoura_id AND p.id = auth.uid()
    ) OR
    (SELECT p.granja_id FROM public.profiles p WHERE p.id = auth.uid()) IS NULL
  )
);

DROP POLICY IF EXISTS "tenant_delete_controle_lavouras" ON public.controle_lavouras;
CREATE POLICY "tenant_delete_controle_lavouras" ON public.controle_lavouras
FOR DELETE USING (
  can_edit(auth.uid()) 
  AND (tenant_id = get_user_tenant_id() OR (is_super_admin(auth.uid()) AND (get_user_tenant_id() IS NULL)))
  AND (
    is_super_admin(auth.uid()) OR 
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.lavouras l 
      JOIN public.profiles p ON l.granja_id = p.granja_id 
      WHERE l.id = controle_lavouras.lavoura_id AND p.id = auth.uid()
    ) OR
    (SELECT p.granja_id FROM public.profiles p WHERE p.id = auth.uid()) IS NULL
  )
);
