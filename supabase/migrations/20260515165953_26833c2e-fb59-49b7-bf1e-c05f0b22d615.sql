-- Add coluna para preservar identidade de super admin original
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_super_admin_original BOOLEAN NOT NULL DEFAULT false;

-- Backfill: marcar todos os profiles que hoje são super admin (admin + sem tenant)
UPDATE public.profiles p
SET is_super_admin_original = true
WHERE p.tenant_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'admin'
  );

-- Atualizar função is_super_admin para usar nova coluna
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id 
      AND p.is_super_admin_original = true
  )
$function$;

-- Atualizar trigger handle_new_user para marcar is_super_admin_original
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count INTEGER;
  default_tenant_id UUID;
  metadata_tenant_id UUID;
  metadata_role TEXT;
  is_first_user BOOLEAN := false;
BEGIN
  metadata_tenant_id := (NEW.raw_user_meta_data ->> 'tenant_id')::uuid;
  metadata_role := NEW.raw_user_meta_data ->> 'role';
  
  IF metadata_tenant_id IS NULL THEN
    SELECT id INTO default_tenant_id FROM public.tenants WHERE ativo = true ORDER BY created_at LIMIT 1;
  ELSE
    default_tenant_id := metadata_tenant_id;
  END IF;
  
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  is_first_user := (user_count = 0);
  
  -- Criar profile (super admin original = primeiro usuário OU admin sem tenant via metadata)
  INSERT INTO public.profiles (id, nome, email, tenant_id, is_super_admin_original)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'nome', 
    NEW.email, 
    CASE WHEN is_first_user THEN NULL ELSE default_tenant_id END,
    is_first_user OR (metadata_role = 'admin' AND metadata_tenant_id IS NULL AND NOT is_first_user AND false)
  );
  
  IF metadata_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, metadata_role::app_role);
  ELSE
    IF is_first_user THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operador');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Garantir política de UPDATE no próprio profile (para o super admin trocar tenant_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' 
      AND policyname = 'Usuários podem atualizar próprio profile'
  ) THEN
    CREATE POLICY "Usuários podem atualizar próprio profile"
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END$$;