ALTER TABLE public.colheitas DROP CONSTRAINT IF EXISTS colheitas_lavoura_id_fkey;
ALTER TABLE public.colheitas DROP COLUMN IF EXISTS lavoura_id;