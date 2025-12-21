-- Adicionar CPF do motorista na tabela remessas_venda
ALTER TABLE public.remessas_venda ADD COLUMN IF NOT EXISTS motorista_cpf character varying NULL;

-- Adicionar CPF padrão do motorista na tabela transportadoras
ALTER TABLE public.transportadoras ADD COLUMN IF NOT EXISTS motorista_cpf_padrao character varying NULL;