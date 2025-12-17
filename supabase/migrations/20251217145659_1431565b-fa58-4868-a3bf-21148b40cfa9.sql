-- Adicionar campos de valor na tabela aplicacoes
ALTER TABLE aplicacoes 
ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_total NUMERIC DEFAULT 0;

-- Inserir novos grupos de produtos para as aplicações
INSERT INTO grupos_produtos (nome, descricao, ativo) VALUES
  ('HERBICIDAS', 'Produtos para controle de plantas invasoras', true),
  ('FUNGICIDAS', 'Produtos para controle de fungos', true),
  ('INSETICIDAS', 'Produtos para controle de insetos', true),
  ('DESSECANTES', 'Produtos para dessecação', true),
  ('ADJUVANTES', 'Produtos adjuvantes para aplicações', true),
  ('MICRONUTRIENTES', 'Micronutrientes para plantas', true),
  ('INOCULANTES', 'Inoculantes biológicos', true),
  ('CALCÁRIOS', 'Calcário e corretivos de solo', true)
ON CONFLICT DO NOTHING;