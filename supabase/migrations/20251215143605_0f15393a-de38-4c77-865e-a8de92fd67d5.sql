-- 1. Alterar cobertura_solo para VARCHAR
ALTER TABLE controle_lavouras 
ALTER COLUMN cobertura_solo TYPE VARCHAR(100) USING cobertura_solo::VARCHAR;

-- 2. Criar tabela de grupos de produtos
CREATE TABLE grupos_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(50) NOT NULL,
  descricao VARCHAR(200),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para grupos_produtos
ALTER TABLE grupos_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública de grupos_produtos" 
ON grupos_produtos FOR SELECT USING (true);

CREATE POLICY "Operadores e admins podem inserir grupos_produtos" 
ON grupos_produtos FOR INSERT WITH CHECK (can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem atualizar grupos_produtos" 
ON grupos_produtos FOR UPDATE USING (can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem excluir grupos_produtos" 
ON grupos_produtos FOR DELETE USING (can_edit(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_grupos_produtos_updated_at
BEFORE UPDATE ON grupos_produtos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir grupos padrão
INSERT INTO grupos_produtos (nome, descricao) VALUES
  ('SEMENTES', 'Sementes para plantio'),
  ('INSUMOS', 'Insumos agrícolas em geral'),
  ('DEFENSIVOS', 'Defensivos agrícolas'),
  ('FERTILIZANTES', 'Fertilizantes e adubos'),
  ('COMBUSTÍVEIS', 'Combustíveis e lubrificantes'),
  ('PEÇAS', 'Peças e acessórios'),
  ('CEREAIS', 'Grãos e cereais'),
  ('OUTROS', 'Outros produtos');

-- 3. Criar tabela de estoque por granja
CREATE TABLE estoque_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  granja_id UUID NOT NULL REFERENCES granjas(id) ON DELETE CASCADE,
  quantidade NUMERIC DEFAULT 0,
  localizacao VARCHAR(50),
  lote VARCHAR(50),
  data_validade DATE,
  custo_unitario NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(produto_id, granja_id, lote)
);

-- RLS para estoque_produtos
ALTER TABLE estoque_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem estoque do seu tenant" 
ON estoque_produtos FOR SELECT USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem inserir estoque" 
ON estoque_produtos FOR INSERT WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem atualizar estoque" 
ON estoque_produtos FOR UPDATE USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem excluir estoque" 
ON estoque_produtos FOR DELETE USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

-- Trigger para updated_at
CREATE TRIGGER update_estoque_produtos_updated_at
BEFORE UPDATE ON estoque_produtos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Adicionar grupo_id como FK na tabela produtos (opcional, mantém campo texto para compatibilidade)
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES grupos_produtos(id);