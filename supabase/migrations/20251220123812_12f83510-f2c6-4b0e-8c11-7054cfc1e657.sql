-- Adicionar campos da Reforma Tributária na tabela produtos
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS cst_ibs character varying(3) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cst_cbs character varying(3) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cst_is character varying(3) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cclass_trib_ibs character varying(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cclass_trib_cbs character varying(20) DEFAULT NULL;