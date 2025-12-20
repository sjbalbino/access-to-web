-- Aumentar coluna chave_acesso de 44 para 47 caracteres
ALTER TABLE notas_fiscais 
ALTER COLUMN chave_acesso TYPE VARCHAR(47);