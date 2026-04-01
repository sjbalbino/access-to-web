
CREATE TABLE public.ibge_municipios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_ibge varchar NOT NULL UNIQUE,
  nome varchar NOT NULL,
  uf varchar(2) NOT NULL
);

CREATE INDEX idx_ibge_municipios_uf ON public.ibge_municipios(uf);
CREATE INDEX idx_ibge_municipios_nome ON public.ibge_municipios(nome);

ALTER TABLE public.ibge_municipios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura publica de municipios IBGE"
  ON public.ibge_municipios
  FOR SELECT
  USING (true);
