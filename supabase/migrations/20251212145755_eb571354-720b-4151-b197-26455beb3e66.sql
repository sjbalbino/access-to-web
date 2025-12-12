-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'operador', 'visualizador');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT,
  email TEXT,
  avatar_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user can edit (admin or operador)
CREATE OR REPLACE FUNCTION public.can_edit(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'operador')
  )
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'nome', NEW.email);
  
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

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Authenticated users can view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update existing table policies to use can_edit function
-- empresas
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Permitir atualização para autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Permitir exclusão para autenticados" ON public.empresas;

CREATE POLICY "Operadores e admins podem inserir empresas"
  ON public.empresas FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem atualizar empresas"
  ON public.empresas FOR UPDATE
  TO authenticated
  USING (public.can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem excluir empresas"
  ON public.empresas FOR DELETE
  TO authenticated
  USING (public.can_edit(auth.uid()));

-- culturas
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.culturas;
DROP POLICY IF EXISTS "Permitir atualização para autenticados" ON public.culturas;
DROP POLICY IF EXISTS "Permitir exclusão para autenticados" ON public.culturas;

CREATE POLICY "Operadores e admins podem inserir culturas"
  ON public.culturas FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem atualizar culturas"
  ON public.culturas FOR UPDATE
  TO authenticated
  USING (public.can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem excluir culturas"
  ON public.culturas FOR DELETE
  TO authenticated
  USING (public.can_edit(auth.uid()));

-- safras
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.safras;
DROP POLICY IF EXISTS "Permitir atualização para autenticados" ON public.safras;
DROP POLICY IF EXISTS "Permitir exclusão para autenticados" ON public.safras;

CREATE POLICY "Operadores e admins podem inserir safras"
  ON public.safras FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem atualizar safras"
  ON public.safras FOR UPDATE
  TO authenticated
  USING (public.can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem excluir safras"
  ON public.safras FOR DELETE
  TO authenticated
  USING (public.can_edit(auth.uid()));

-- produtores
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.produtores;
DROP POLICY IF EXISTS "Permitir atualização para autenticados" ON public.produtores;
DROP POLICY IF EXISTS "Permitir exclusão para autenticados" ON public.produtores;

CREATE POLICY "Operadores e admins podem inserir produtores"
  ON public.produtores FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem atualizar produtores"
  ON public.produtores FOR UPDATE
  TO authenticated
  USING (public.can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem excluir produtores"
  ON public.produtores FOR DELETE
  TO authenticated
  USING (public.can_edit(auth.uid()));

-- lavouras
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.lavouras;
DROP POLICY IF EXISTS "Permitir atualização para autenticados" ON public.lavouras;
DROP POLICY IF EXISTS "Permitir exclusão para autenticados" ON public.lavouras;

CREATE POLICY "Operadores e admins podem inserir lavouras"
  ON public.lavouras FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem atualizar lavouras"
  ON public.lavouras FOR UPDATE
  TO authenticated
  USING (public.can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem excluir lavouras"
  ON public.lavouras FOR DELETE
  TO authenticated
  USING (public.can_edit(auth.uid()));

-- variedades
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.variedades;
DROP POLICY IF EXISTS "Permitir atualização para autenticados" ON public.variedades;
DROP POLICY IF EXISTS "Permitir exclusão para autenticados" ON public.variedades;

CREATE POLICY "Operadores e admins podem inserir variedades"
  ON public.variedades FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem atualizar variedades"
  ON public.variedades FOR UPDATE
  TO authenticated
  USING (public.can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem excluir variedades"
  ON public.variedades FOR DELETE
  TO authenticated
  USING (public.can_edit(auth.uid()));

-- inscricoes_produtor
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.inscricoes_produtor;
DROP POLICY IF EXISTS "Permitir atualização para autenticados" ON public.inscricoes_produtor;
DROP POLICY IF EXISTS "Permitir exclusão para autenticados" ON public.inscricoes_produtor;

CREATE POLICY "Operadores e admins podem inserir inscricoes"
  ON public.inscricoes_produtor FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem atualizar inscricoes"
  ON public.inscricoes_produtor FOR UPDATE
  TO authenticated
  USING (public.can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem excluir inscricoes"
  ON public.inscricoes_produtor FOR DELETE
  TO authenticated
  USING (public.can_edit(auth.uid()));