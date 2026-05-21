ALTER TABLE public.produtores DROP CONSTRAINT IF EXISTS produtores_codigo_key;

CREATE UNIQUE INDEX IF NOT EXISTS produtores_granja_codigo_uniq
  ON public.produtores (granja_id, codigo)
  WHERE codigo IS NOT NULL;