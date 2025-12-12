-- Sistema de Gerenciamento Agropecuário - Fase 1A: Cadastros Base

-- 1. Tabela de Empresas/Granjas
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE,
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),
  cnpj VARCHAR(18) UNIQUE,
  inscricao_estadual VARCHAR(20),
  logradouro VARCHAR(255),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  cep VARCHAR(10),
  telefone VARCHAR(20),
  email VARCHAR(255),
  total_hectares DECIMAL(12, 2) DEFAULT 0,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabela de Culturas
CREATE TABLE public.culturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE,
  nome VARCHAR(100) NOT NULL,
  peso_saco_industria DECIMAL(8, 2) DEFAULT 60,
  peso_saco_semente DECIMAL(8, 2) DEFAULT 60,
  informar_ph BOOLEAN DEFAULT false,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabela de Variedades (vinculada à Cultura)
CREATE TABLE public.variedades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cultura_id UUID REFERENCES public.culturas(id) ON DELETE CASCADE,
  codigo VARCHAR(20),
  nome VARCHAR(100) NOT NULL,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Tabela de Safras
CREATE TABLE public.safras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE,
  nome VARCHAR(100) NOT NULL,
  cultura_id UUID REFERENCES public.culturas(id),
  ano_colheita INTEGER,
  data_inicio DATE,
  data_fim DATE,
  status VARCHAR(20) DEFAULT 'ativa' CHECK (status IN ('ativa', 'encerrada', 'planejada')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Tabela de Produtores/Sócios/Proprietários
CREATE TABLE public.produtores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE,
  nome VARCHAR(255) NOT NULL,
  tipo_pessoa VARCHAR(10) DEFAULT 'fisica' CHECK (tipo_pessoa IN ('fisica', 'juridica')),
  cpf_cnpj VARCHAR(18) UNIQUE,
  identidade VARCHAR(20),
  empresa_id UUID REFERENCES public.empresas(id),
  logradouro VARCHAR(255),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  cep VARCHAR(10),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  email VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Tabela de Inscrições (vinculada ao Produtor)
CREATE TABLE public.inscricoes_produtor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produtor_id UUID REFERENCES public.produtores(id) ON DELETE CASCADE,
  granja VARCHAR(255),
  cpf_cnpj VARCHAR(18),
  inscricao_estadual VARCHAR(20),
  tipo VARCHAR(50),
  logradouro VARCHAR(255),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Tabela de Lavouras/Talhões
CREATE TABLE public.lavouras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE,
  nome VARCHAR(100) NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id),
  total_hectares DECIMAL(12, 2) DEFAULT 0,
  area_nao_aproveitavel DECIMAL(12, 2) DEFAULT 0,
  area_plantio DECIMAL(12, 2) DEFAULT 0,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  observacoes TEXT,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.culturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscricoes_produtor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lavouras ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Por enquanto permitir leitura pública, escrita para autenticados
CREATE POLICY "Permitir leitura pública de empresas" ON public.empresas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção para autenticados" ON public.empresas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização para autenticados" ON public.empresas FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir exclusão para autenticados" ON public.empresas FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir leitura pública de culturas" ON public.culturas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção para autenticados" ON public.culturas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização para autenticados" ON public.culturas FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir exclusão para autenticados" ON public.culturas FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir leitura pública de variedades" ON public.variedades FOR SELECT USING (true);
CREATE POLICY "Permitir inserção para autenticados" ON public.variedades FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização para autenticados" ON public.variedades FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir exclusão para autenticados" ON public.variedades FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir leitura pública de safras" ON public.safras FOR SELECT USING (true);
CREATE POLICY "Permitir inserção para autenticados" ON public.safras FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização para autenticados" ON public.safras FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir exclusão para autenticados" ON public.safras FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir leitura pública de produtores" ON public.produtores FOR SELECT USING (true);
CREATE POLICY "Permitir inserção para autenticados" ON public.produtores FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização para autenticados" ON public.produtores FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir exclusão para autenticados" ON public.produtores FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir leitura pública de inscricoes" ON public.inscricoes_produtor FOR SELECT USING (true);
CREATE POLICY "Permitir inserção para autenticados" ON public.inscricoes_produtor FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização para autenticados" ON public.inscricoes_produtor FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir exclusão para autenticados" ON public.inscricoes_produtor FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir leitura pública de lavouras" ON public.lavouras FOR SELECT USING (true);
CREATE POLICY "Permitir inserção para autenticados" ON public.lavouras FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização para autenticados" ON public.lavouras FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir exclusão para autenticados" ON public.lavouras FOR DELETE USING (auth.role() = 'authenticated');

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_culturas_updated_at BEFORE UPDATE ON public.culturas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_variedades_updated_at BEFORE UPDATE ON public.variedades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_safras_updated_at BEFORE UPDATE ON public.safras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_produtores_updated_at BEFORE UPDATE ON public.produtores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inscricoes_updated_at BEFORE UPDATE ON public.inscricoes_produtor FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lavouras_updated_at BEFORE UPDATE ON public.lavouras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();