-- Adicionar coluna cst_ipi_padrao à tabela cfops
ALTER TABLE public.cfops
ADD COLUMN cst_ipi_padrao character varying DEFAULT NULL;