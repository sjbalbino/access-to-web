-- Aumentar coluna uuid_api de 50 para 100 caracteres para suportar referências maiores
ALTER TABLE notas_fiscais 
ALTER COLUMN uuid_api TYPE VARCHAR(100);