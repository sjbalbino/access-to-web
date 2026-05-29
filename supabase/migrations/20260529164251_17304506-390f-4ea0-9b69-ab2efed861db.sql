
-- Ajusta trigger handle_new_user para suportar fluxo de aprovação:
-- - Cadastro público (sem metadata.role): cria profile com ativo=false, tenant_id=null e SEM user_roles
-- - create-user (com metadata.role): mantém comportamento atual (já liberado)
-- - Primeiro usuário do sistema: continua virando super admin

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

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  is_first_user := (user_count = 0);

  -- Resolve tenant
  IF metadata_tenant_id IS NOT NULL THEN
    default_tenant_id := metadata_tenant_id;
  ELSIF metadata_role IS NOT NULL THEN
    -- create-user sem tenant (super admin criando super admin)
    default_tenant_id := NULL;
  ELSE
    -- Cadastro público: fica sem tenant, aguardando liberação
    default_tenant_id := NULL;
  END IF;

  -- Profile
  INSERT INTO public.profiles (id, nome, email, tenant_id, is_super_admin_original, ativo)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'nome',
    NEW.email,
    CASE WHEN is_first_user THEN NULL ELSE default_tenant_id END,
    is_first_user,
    -- Ativo apenas quando: primeiro usuário OU criado via create-user (metadata.role presente)
    is_first_user OR (metadata_role IS NOT NULL)
  );

  -- Role: só cria se for primeiro usuário ou se vier explicitamente do create-user
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSIF metadata_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, metadata_role::app_role);
  END IF;
  -- Cadastro público: sem role, aguardando aprovação

  RETURN NEW;
END;
$function$;

-- Permitir que admins/super admins vejam e atualizem profiles pendentes (sem role e sem tenant)
-- As políticas existentes provavelmente já cobrem mesmo tenant; precisamos garantir leitura/update de pendentes.

-- Política: super admin pode ver/atualizar qualquer profile (incluindo pendentes)
DROP POLICY IF EXISTS "Super admins manage all profiles" ON public.profiles;
CREATE POLICY "Super admins manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Política: admins de qualquer tenant podem ver profiles pendentes (tenant_id IS NULL e ativo=false)
DROP POLICY IF EXISTS "Admins can view pending signups" ON public.profiles;
CREATE POLICY "Admins can view pending signups"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND tenant_id IS NULL
  AND ativo = false
);
