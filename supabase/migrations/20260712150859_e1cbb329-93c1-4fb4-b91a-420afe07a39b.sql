ALTER TABLE public.inscricoes_produtor ADD COLUMN IF NOT EXISTS codigo TEXT;
CREATE INDEX IF NOT EXISTS idx_inscricoes_produtor_codigo ON public.inscricoes_produtor(codigo) WHERE codigo IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_inscricoes_produtor_codigo_granja ON public.inscricoes_produtor(granja_id, codigo) WHERE codigo IS NOT NULL;