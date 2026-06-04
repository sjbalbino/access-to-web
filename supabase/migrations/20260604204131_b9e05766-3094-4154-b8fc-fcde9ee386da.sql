ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS conta_gerencial_id UUID REFERENCES public.sub_centros_custo(id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;