ALTER TABLE public.grupos_produtos ADD COLUMN IF NOT EXISTS codigo_dre TEXT;
GRANT ALL ON public.grupos_produtos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos_produtos TO authenticated;