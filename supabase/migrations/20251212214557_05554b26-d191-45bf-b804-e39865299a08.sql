-- Remover campo codigo da tabela controle_lavouras (o id já é a chave)
ALTER TABLE public.controle_lavouras DROP COLUMN IF EXISTS codigo;