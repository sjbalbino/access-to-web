-- Adicionar campos para cálculo automático de impostos na tabela cfops
ALTER TABLE public.cfops
ADD COLUMN IF NOT EXISTS incidencia_icms boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS incidencia_pis_cofins boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS incidencia_ibs_cbs boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cst_icms_padrao character varying(3) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cst_pis_padrao character varying(3) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cst_cofins_padrao character varying(3) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cst_ibs_padrao character varying(3) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cst_cbs_padrao character varying(3) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cst_is_padrao character varying(3) DEFAULT NULL;