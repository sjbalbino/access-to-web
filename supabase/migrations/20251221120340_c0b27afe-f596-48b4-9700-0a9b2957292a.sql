-- Adicionar campo motorista_padrao na tabela transportadoras
ALTER TABLE public.transportadoras 
ADD COLUMN motorista_padrao character varying NULL;