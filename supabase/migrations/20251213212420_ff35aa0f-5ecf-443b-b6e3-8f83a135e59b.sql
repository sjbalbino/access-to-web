-- Adicionar coluna tipo_produtor na tabela produtores
ALTER TABLE produtores 
ADD COLUMN tipo_produtor VARCHAR DEFAULT 'produtor';

-- Atualizar registros existentes para ter o valor padrão
UPDATE produtores SET tipo_produtor = 'produtor' WHERE tipo_produtor IS NULL;