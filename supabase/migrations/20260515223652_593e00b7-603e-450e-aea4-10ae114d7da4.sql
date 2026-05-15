ALTER TABLE public.granjas DROP CONSTRAINT IF EXISTS empresas_codigo_key;
ALTER TABLE public.granjas DROP CONSTRAINT IF EXISTS empresas_cnpj_key;

CREATE UNIQUE INDEX IF NOT EXISTS granjas_tenant_codigo_uniq
  ON public.granjas (tenant_id, codigo)
  WHERE codigo IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS granjas_tenant_cnpj_uniq
  ON public.granjas (tenant_id, cnpj)
  WHERE cnpj IS NOT NULL;