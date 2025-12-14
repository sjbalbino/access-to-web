-- =============================================
-- Habilitar RLS na tabela tenants e criar políticas
-- =============================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Função para verificar super admin (admin sem tenant = super admin)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id 
      AND ur.role = 'admin'
      AND p.tenant_id IS NULL
  )
$$;

-- Super admins podem ver todos os tenants
CREATE POLICY "Super admins podem ver todos os tenants"
ON public.tenants FOR SELECT
USING (is_super_admin(auth.uid()));

-- Super admins podem gerenciar tenants
CREATE POLICY "Super admins podem inserir tenants"
ON public.tenants FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins podem atualizar tenants"
ON public.tenants FOR UPDATE
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins podem excluir tenants"
ON public.tenants FOR DELETE
USING (is_super_admin(auth.uid()));

-- Usuários podem ver seu próprio tenant
CREATE POLICY "Usuários podem ver seu próprio tenant"
ON public.tenants FOR SELECT
USING (id = get_user_tenant_id());

-- =============================================
-- Atualizar RLS das granjas (ex-empresas)
-- =============================================

DROP POLICY IF EXISTS "Operadores e admins podem atualizar empresas" ON public.granjas;
DROP POLICY IF EXISTS "Operadores e admins podem excluir empresas" ON public.granjas;
DROP POLICY IF EXISTS "Operadores e admins podem inserir empresas" ON public.granjas;
DROP POLICY IF EXISTS "Permitir leitura pública de empresas" ON public.granjas;

CREATE POLICY "Usuários veem granjas do seu tenant"
ON public.granjas FOR SELECT
USING (tenant_id = get_user_tenant_id() OR is_super_admin(auth.uid()) OR tenant_id IS NULL);

CREATE POLICY "Operadores e admins podem inserir granjas"
ON public.granjas FOR INSERT
WITH CHECK (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR is_super_admin(auth.uid()) OR tenant_id IS NULL));

CREATE POLICY "Operadores e admins podem atualizar granjas"
ON public.granjas FOR UPDATE
USING (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR is_super_admin(auth.uid()) OR tenant_id IS NULL));

CREATE POLICY "Operadores e admins podem excluir granjas"
ON public.granjas FOR DELETE
USING (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR is_super_admin(auth.uid()) OR tenant_id IS NULL));

-- =============================================
-- Função auxiliar para verificar tenant via granja
-- =============================================

CREATE OR REPLACE FUNCTION public.granja_belongs_to_tenant(_granja_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.granjas
    WHERE id = _granja_id AND (tenant_id = get_user_tenant_id() OR tenant_id IS NULL)
  ) OR is_super_admin(auth.uid()) OR _granja_id IS NULL
$$;

-- =============================================
-- Atualizar RLS de lavouras
-- =============================================

DROP POLICY IF EXISTS "Permitir leitura pública de lavouras" ON public.lavouras;
DROP POLICY IF EXISTS "Operadores e admins podem inserir lavouras" ON public.lavouras;
DROP POLICY IF EXISTS "Operadores e admins podem atualizar lavouras" ON public.lavouras;
DROP POLICY IF EXISTS "Operadores e admins podem excluir lavouras" ON public.lavouras;

CREATE POLICY "Usuários veem lavouras do seu tenant"
ON public.lavouras FOR SELECT
USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem inserir lavouras"
ON public.lavouras FOR INSERT
WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem atualizar lavouras"
ON public.lavouras FOR UPDATE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem excluir lavouras"
ON public.lavouras FOR DELETE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

-- =============================================
-- Atualizar RLS de silos
-- =============================================

DROP POLICY IF EXISTS "Permitir leitura pública de silos" ON public.silos;
DROP POLICY IF EXISTS "Operadores e admins podem inserir silos" ON public.silos;
DROP POLICY IF EXISTS "Operadores e admins podem atualizar silos" ON public.silos;
DROP POLICY IF EXISTS "Operadores e admins podem excluir silos" ON public.silos;

CREATE POLICY "Usuários veem silos do seu tenant"
ON public.silos FOR SELECT
USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem inserir silos"
ON public.silos FOR INSERT
WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem atualizar silos"
ON public.silos FOR UPDATE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem excluir silos"
ON public.silos FOR DELETE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

-- =============================================
-- Atualizar RLS de placas
-- =============================================

DROP POLICY IF EXISTS "Permitir leitura pública de placas" ON public.placas;
DROP POLICY IF EXISTS "Operadores e admins podem inserir placas" ON public.placas;
DROP POLICY IF EXISTS "Operadores e admins podem atualizar placas" ON public.placas;
DROP POLICY IF EXISTS "Operadores e admins podem excluir placas" ON public.placas;

CREATE POLICY "Usuários veem placas do seu tenant"
ON public.placas FOR SELECT
USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem inserir placas"
ON public.placas FOR INSERT
WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem atualizar placas"
ON public.placas FOR UPDATE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem excluir placas"
ON public.placas FOR DELETE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

-- =============================================
-- Atualizar RLS de produtores
-- =============================================

DROP POLICY IF EXISTS "Permitir leitura pública de produtores" ON public.produtores;
DROP POLICY IF EXISTS "Operadores e admins podem inserir produtores" ON public.produtores;
DROP POLICY IF EXISTS "Operadores e admins podem atualizar produtores" ON public.produtores;
DROP POLICY IF EXISTS "Operadores e admins podem excluir produtores" ON public.produtores;

CREATE POLICY "Usuários veem produtores do seu tenant"
ON public.produtores FOR SELECT
USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem inserir produtores"
ON public.produtores FOR INSERT
WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem atualizar produtores"
ON public.produtores FOR UPDATE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem excluir produtores"
ON public.produtores FOR DELETE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

-- =============================================
-- Atualizar RLS de produtos
-- =============================================

DROP POLICY IF EXISTS "Permitir leitura pública de produtos" ON public.produtos;
DROP POLICY IF EXISTS "Operadores e admins podem inserir produtos" ON public.produtos;
DROP POLICY IF EXISTS "Operadores e admins podem atualizar produtos" ON public.produtos;
DROP POLICY IF EXISTS "Operadores e admins podem excluir produtos" ON public.produtos;

CREATE POLICY "Usuários veem produtos do seu tenant"
ON public.produtos FOR SELECT
USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem inserir produtos"
ON public.produtos FOR INSERT
WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem atualizar produtos"
ON public.produtos FOR UPDATE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem excluir produtos"
ON public.produtos FOR DELETE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

-- =============================================
-- Atualizar RLS de clientes_fornecedores
-- =============================================

DROP POLICY IF EXISTS "Permitir leitura pública de clientes_fornecedores" ON public.clientes_fornecedores;
DROP POLICY IF EXISTS "Operadores e admins podem inserir clientes_fornecedores" ON public.clientes_fornecedores;
DROP POLICY IF EXISTS "Operadores e admins podem atualizar clientes_fornecedores" ON public.clientes_fornecedores;
DROP POLICY IF EXISTS "Operadores e admins podem excluir clientes_fornecedores" ON public.clientes_fornecedores;

CREATE POLICY "Usuários veem clientes_fornecedores do seu tenant"
ON public.clientes_fornecedores FOR SELECT
USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem inserir clientes_fornecedores"
ON public.clientes_fornecedores FOR INSERT
WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem atualizar clientes_fornecedores"
ON public.clientes_fornecedores FOR UPDATE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem excluir clientes_fornecedores"
ON public.clientes_fornecedores FOR DELETE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

-- =============================================
-- Atualizar RLS de inscricoes_produtor
-- =============================================

DROP POLICY IF EXISTS "Permitir leitura pública de inscricoes" ON public.inscricoes_produtor;
DROP POLICY IF EXISTS "Operadores e admins podem inserir inscricoes" ON public.inscricoes_produtor;
DROP POLICY IF EXISTS "Operadores e admins podem atualizar inscricoes" ON public.inscricoes_produtor;
DROP POLICY IF EXISTS "Operadores e admins podem excluir inscricoes" ON public.inscricoes_produtor;

CREATE POLICY "Usuários veem inscricoes do seu tenant"
ON public.inscricoes_produtor FOR SELECT
USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem inserir inscricoes"
ON public.inscricoes_produtor FOR INSERT
WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem atualizar inscricoes"
ON public.inscricoes_produtor FOR UPDATE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem excluir inscricoes"
ON public.inscricoes_produtor FOR DELETE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

-- =============================================
-- Atualizar handle_new_user para incluir tenant
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  default_tenant_id UUID;
BEGIN
  -- Get default tenant (first one) or null if none exists
  SELECT id INTO default_tenant_id FROM public.tenants WHERE ativo = true ORDER BY created_at LIMIT 1;
  
  -- Create profile with tenant
  INSERT INTO public.profiles (id, nome, email, tenant_id)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'nome', NEW.email, default_tenant_id);
  
  -- Check if this is the first user (make them admin)
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operador');
  END IF;
  
  RETURN NEW;
END;
$$;