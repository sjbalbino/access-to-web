-- Adicionar campos de endereço completo e contato na tabela inscricoes_produtor
ALTER TABLE inscricoes_produtor 
ADD COLUMN IF NOT EXISTS cep VARCHAR,
ADD COLUMN IF NOT EXISTS numero VARCHAR,
ADD COLUMN IF NOT EXISTS complemento VARCHAR,
ADD COLUMN IF NOT EXISTS bairro VARCHAR,
ADD COLUMN IF NOT EXISTS telefone VARCHAR,
ADD COLUMN IF NOT EXISTS email VARCHAR;