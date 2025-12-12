-- Tabela de Clientes/Fornecedores
CREATE TABLE public.clientes_fornecedores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid REFERENCES public.empresas(id),
  tipo varchar NOT NULL DEFAULT 'ambos', -- 'cliente', 'fornecedor', 'ambos'
  tipo_pessoa varchar DEFAULT 'juridica', -- 'fisica', 'juridica'
  codigo varchar,
  nome varchar NOT NULL,
  nome_fantasia varchar,
  cpf_cnpj varchar,
  inscricao_estadual varchar,
  logradouro varchar,
  numero varchar,
  complemento varchar,
  bairro varchar,
  cidade varchar,
  uf varchar(2),
  cep varchar(10),
  telefone varchar,
  celular varchar,
  email varchar,
  contato varchar,
  observacoes text,
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de Unidades de Medida
CREATE TABLE public.unidades_medida (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo varchar NOT NULL UNIQUE,
  descricao varchar NOT NULL,
  sigla varchar(10),
  ativa boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de Produtos/Insumos
CREATE TABLE public.produtos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid REFERENCES public.empresas(id),
  tipo varchar NOT NULL DEFAULT 'insumo', -- 'insumo', 'produto', 'semente'
  codigo varchar,
  nome varchar NOT NULL,
  descricao text,
  unidade_medida_id uuid REFERENCES public.unidades_medida(id),
  estoque_minimo numeric DEFAULT 0,
  estoque_atual numeric DEFAULT 0,
  preco_custo numeric DEFAULT 0,
  preco_venda numeric DEFAULT 0,
  fornecedor_id uuid REFERENCES public.clientes_fornecedores(id),
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de Silos
CREATE TABLE public.silos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid REFERENCES public.empresas(id),
  codigo varchar,
  nome varchar NOT NULL,
  capacidade_kg numeric DEFAULT 0,
  capacidade_sacas numeric DEFAULT 0,
  tipo varchar DEFAULT 'armazenamento', -- 'armazenamento', 'secagem', 'transbordo'
  localizacao varchar,
  observacoes text,
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de Placas (Veículos/Carretas)
CREATE TABLE public.placas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid REFERENCES public.empresas(id),
  placa varchar NOT NULL,
  tipo varchar DEFAULT 'veiculo', -- 'veiculo', 'carreta', 'implemento'
  marca varchar,
  modelo varchar,
  ano integer,
  cor varchar,
  capacidade_kg numeric DEFAULT 0,
  proprietario varchar,
  observacoes text,
  ativa boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de Umidades
CREATE TABLE public.tabela_umidades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cultura_id uuid REFERENCES public.culturas(id),
  umidade_minima numeric NOT NULL,
  umidade_maxima numeric NOT NULL,
  desconto_percentual numeric DEFAULT 0,
  observacoes text,
  ativa boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.clientes_fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades_medida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.silos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabela_umidades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clientes_fornecedores
CREATE POLICY "Permitir leitura pública de clientes_fornecedores" ON public.clientes_fornecedores FOR SELECT USING (true);
CREATE POLICY "Operadores e admins podem inserir clientes_fornecedores" ON public.clientes_fornecedores FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem atualizar clientes_fornecedores" ON public.clientes_fornecedores FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem excluir clientes_fornecedores" ON public.clientes_fornecedores FOR DELETE USING (can_edit(auth.uid()));

-- RLS Policies for unidades_medida
CREATE POLICY "Permitir leitura pública de unidades_medida" ON public.unidades_medida FOR SELECT USING (true);
CREATE POLICY "Operadores e admins podem inserir unidades_medida" ON public.unidades_medida FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem atualizar unidades_medida" ON public.unidades_medida FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem excluir unidades_medida" ON public.unidades_medida FOR DELETE USING (can_edit(auth.uid()));

-- RLS Policies for produtos
CREATE POLICY "Permitir leitura pública de produtos" ON public.produtos FOR SELECT USING (true);
CREATE POLICY "Operadores e admins podem inserir produtos" ON public.produtos FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem atualizar produtos" ON public.produtos FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem excluir produtos" ON public.produtos FOR DELETE USING (can_edit(auth.uid()));

-- RLS Policies for silos
CREATE POLICY "Permitir leitura pública de silos" ON public.silos FOR SELECT USING (true);
CREATE POLICY "Operadores e admins podem inserir silos" ON public.silos FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem atualizar silos" ON public.silos FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem excluir silos" ON public.silos FOR DELETE USING (can_edit(auth.uid()));

-- RLS Policies for placas
CREATE POLICY "Permitir leitura pública de placas" ON public.placas FOR SELECT USING (true);
CREATE POLICY "Operadores e admins podem inserir placas" ON public.placas FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem atualizar placas" ON public.placas FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem excluir placas" ON public.placas FOR DELETE USING (can_edit(auth.uid()));

-- RLS Policies for tabela_umidades
CREATE POLICY "Permitir leitura pública de tabela_umidades" ON public.tabela_umidades FOR SELECT USING (true);
CREATE POLICY "Operadores e admins podem inserir tabela_umidades" ON public.tabela_umidades FOR INSERT WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem atualizar tabela_umidades" ON public.tabela_umidades FOR UPDATE USING (can_edit(auth.uid()));
CREATE POLICY "Operadores e admins podem excluir tabela_umidades" ON public.tabela_umidades FOR DELETE USING (can_edit(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_clientes_fornecedores_updated_at BEFORE UPDATE ON public.clientes_fornecedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_unidades_medida_updated_at BEFORE UPDATE ON public.unidades_medida FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_silos_updated_at BEFORE UPDATE ON public.silos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_placas_updated_at BEFORE UPDATE ON public.placas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tabela_umidades_updated_at BEFORE UPDATE ON public.tabela_umidades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default units of measure
INSERT INTO public.unidades_medida (codigo, descricao, sigla) VALUES
('UN', 'Unidade', 'UN'),
('KG', 'Quilograma', 'KG'),
('SC', 'Saca', 'SC'),
('L', 'Litro', 'L'),
('M', 'Metro', 'M'),
('M2', 'Metro Quadrado', 'M²'),
('M3', 'Metro Cúbico', 'M³'),
('TON', 'Tonelada', 'TON'),
('HA', 'Hectare', 'HA'),
('PCT', 'Pacote', 'PCT'),
('CX', 'Caixa', 'CX'),
('GL', 'Galão', 'GL');