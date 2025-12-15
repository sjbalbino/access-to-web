-- Adicionar colunas valor_unitario e valor_total na tabela plantios
ALTER TABLE public.plantios ADD COLUMN valor_unitario NUMERIC DEFAULT 0;
ALTER TABLE public.plantios ADD COLUMN valor_total NUMERIC DEFAULT 0;