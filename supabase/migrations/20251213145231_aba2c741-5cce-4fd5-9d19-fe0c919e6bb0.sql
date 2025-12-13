-- Adicionar colunas faltantes na tabela colheitas
ALTER TABLE public.colheitas ADD COLUMN IF NOT EXISTS peso_bruto numeric DEFAULT 0;
ALTER TABLE public.colheitas ADD COLUMN IF NOT EXISTS peso_tara numeric DEFAULT 0;
ALTER TABLE public.colheitas ADD COLUMN IF NOT EXISTS kg_impureza numeric DEFAULT 0;
ALTER TABLE public.colheitas ADD COLUMN IF NOT EXISTS percentual_desconto numeric DEFAULT 0;
ALTER TABLE public.colheitas ADD COLUMN IF NOT EXISTS kg_umidade numeric DEFAULT 0;
ALTER TABLE public.colheitas ADD COLUMN IF NOT EXISTS percentual_avariados numeric DEFAULT 0;
ALTER TABLE public.colheitas ADD COLUMN IF NOT EXISTS kg_avariados numeric DEFAULT 0;
ALTER TABLE public.colheitas ADD COLUMN IF NOT EXISTS percentual_outros numeric DEFAULT 0;
ALTER TABLE public.colheitas ADD COLUMN IF NOT EXISTS kg_outros numeric DEFAULT 0;
ALTER TABLE public.colheitas ADD COLUMN IF NOT EXISTS kg_desconto_total numeric DEFAULT 0;
ALTER TABLE public.colheitas ADD COLUMN IF NOT EXISTS total_sacos numeric DEFAULT 0;
ALTER TABLE public.colheitas ADD COLUMN IF NOT EXISTS ph numeric DEFAULT 0;
ALTER TABLE public.colheitas ADD COLUMN IF NOT EXISTS variedade_id uuid REFERENCES public.variedades(id);
ALTER TABLE public.colheitas ADD COLUMN IF NOT EXISTS tipo_colheita character varying DEFAULT 'industria';