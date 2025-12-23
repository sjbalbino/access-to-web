-- Remover a constraint de unicidade existente
ALTER TABLE lavouras DROP CONSTRAINT IF EXISTS lavouras_codigo_key;

-- Alterar o tipo para integer com valor padrão 0
ALTER TABLE lavouras 
  ALTER COLUMN codigo TYPE integer USING COALESCE(NULLIF(codigo, '')::integer, 0),
  ALTER COLUMN codigo SET DEFAULT 0,
  ALTER COLUMN codigo SET NOT NULL;