-- =============================================
-- FASE 1: Criar tabela tenants (Empresas Contratantes)
-- =============================================

CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR,
    razao_social VARCHAR NOT NULL,
    nome_fantasia VARCHAR,
    cnpj VARCHAR,
    inscricao_estadual VARCHAR,
    logradouro VARCHAR,
    numero VARCHAR,
    complemento VARCHAR,
    bairro VARCHAR,
    cidade VARCHAR,
    uf VARCHAR,
    cep VARCHAR,
    telefone VARCHAR,
    email VARCHAR,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FASE 2: Adicionar tenant_id ao profiles
-- =============================================

ALTER TABLE public.profiles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);

-- =============================================
-- FASE 3: Renomear empresas para granjas
-- =============================================

ALTER TABLE public.empresas RENAME TO granjas;

-- Adicionar tenant_id às granjas
ALTER TABLE public.granjas ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);

-- =============================================
-- FASE 4: Renomear empresa_id para granja_id em todas as tabelas
-- =============================================

-- lavouras
ALTER TABLE public.lavouras RENAME COLUMN empresa_id TO granja_id;

-- silos
ALTER TABLE public.silos RENAME COLUMN empresa_id TO granja_id;

-- placas
ALTER TABLE public.placas RENAME COLUMN empresa_id TO granja_id;

-- produtores
ALTER TABLE public.produtores RENAME COLUMN empresa_id TO granja_id;

-- produtos
ALTER TABLE public.produtos RENAME COLUMN empresa_id TO granja_id;

-- clientes_fornecedores
ALTER TABLE public.clientes_fornecedores RENAME COLUMN empresa_id TO granja_id;

-- inscricoes_produtor
ALTER TABLE public.inscricoes_produtor RENAME COLUMN empresa_id TO granja_id;

-- =============================================
-- FASE 5: Função para obter tenant do usuário atual
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$;