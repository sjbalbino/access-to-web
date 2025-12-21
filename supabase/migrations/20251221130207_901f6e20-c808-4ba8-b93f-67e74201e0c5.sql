-- Adicionar campos para separar valores de remessa e nota
ALTER TABLE public.remessas_venda 
ADD COLUMN IF NOT EXISTS valor_remessa numeric NULL,
ADD COLUMN IF NOT EXISTS sacos_remessa numeric NULL,
ADD COLUMN IF NOT EXISTS sacos_nota numeric NULL;

-- Adicionar campos para local de entrega na remessa (copiados do contrato, editáveis por remessa)
ALTER TABLE public.remessas_venda 
ADD COLUMN IF NOT EXISTS local_entrega_nome character varying NULL,
ADD COLUMN IF NOT EXISTS local_entrega_cnpj_cpf character varying NULL,
ADD COLUMN IF NOT EXISTS local_entrega_ie character varying NULL,
ADD COLUMN IF NOT EXISTS local_entrega_logradouro character varying NULL,
ADD COLUMN IF NOT EXISTS local_entrega_numero character varying NULL,
ADD COLUMN IF NOT EXISTS local_entrega_complemento character varying NULL,
ADD COLUMN IF NOT EXISTS local_entrega_bairro character varying NULL,
ADD COLUMN IF NOT EXISTS local_entrega_cidade character varying NULL,
ADD COLUMN IF NOT EXISTS local_entrega_uf character varying NULL,
ADD COLUMN IF NOT EXISTS local_entrega_cep character varying NULL;

-- Adicionar placa e UF da placa diretamente na remessa (da transportadora)
ALTER TABLE public.remessas_venda 
ADD COLUMN IF NOT EXISTS placa character varying NULL,
ADD COLUMN IF NOT EXISTS uf_placa character varying NULL;