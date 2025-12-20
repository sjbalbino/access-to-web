-- Add new fields for contract types
ALTER TABLE contratos_venda
ADD COLUMN IF NOT EXISTS exportacao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS remessa_deposito BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS retorno_deposito BOOLEAN DEFAULT false;