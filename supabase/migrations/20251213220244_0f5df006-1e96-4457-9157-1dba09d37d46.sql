-- Add empresa_id column to inscricoes_produtor
ALTER TABLE inscricoes_produtor 
ADD COLUMN empresa_id UUID REFERENCES empresas(id);