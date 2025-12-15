-- Atualizar a função handle_new_user para aceitar tenant_id e role via metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  default_tenant_id UUID;
  metadata_tenant_id UUID;
  metadata_role TEXT;
BEGIN
  -- Verificar se tenant_id foi passado via metadata (criação por admin)
  metadata_tenant_id := (NEW.raw_user_meta_data ->> 'tenant_id')::uuid;
  metadata_role := NEW.raw_user_meta_data ->> 'role';
  
  -- Se não foi passado tenant_id via metadata, usar o primeiro tenant ativo
  IF metadata_tenant_id IS NULL THEN
    SELECT id INTO default_tenant_id FROM public.tenants WHERE ativo = true ORDER BY created_at LIMIT 1;
  ELSE
    default_tenant_id := metadata_tenant_id;
  END IF;
  
  -- Criar profile com tenant
  INSERT INTO public.profiles (id, nome, email, tenant_id)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'nome', NEW.email, default_tenant_id);
  
  -- Verificar se role foi passado via metadata (criação por admin)
  IF metadata_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, metadata_role::app_role);
  ELSE
    -- Check if this is the first user (make them admin)
    SELECT COUNT(*) INTO user_count FROM public.user_roles;
    
    IF user_count = 0 THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operador');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;