-- Adiciona a coluna granja_id que estava faltando na tabela controle_lavouras
ALTER TABLE public.controle_lavouras ADD COLUMN IF NOT EXISTS granja_id UUID REFERENCES public.granjas(id);

-- Tentar preencher granja_id a partir da tabela de lavouras para registros existentes
UPDATE public.controle_lavouras cl
SET granja_id = l.granja_id
FROM public.lavouras l
WHERE cl.lavoura_id = l.id
AND cl.granja_id IS NULL;

-- Remove a restrição de unicidade antiga que não considerava a granja
ALTER TABLE public.controle_lavouras DROP CONSTRAINT IF EXISTS controle_lavouras_lavoura_id_safra_id_key;

-- Adiciona a nova restrição de unicidade incluindo a granja_id
ALTER TABLE public.controle_lavouras ADD CONSTRAINT controle_lavouras_granja_id_lavoura_id_safra_id_key UNIQUE (granja_id, lavoura_id, safra_id);
