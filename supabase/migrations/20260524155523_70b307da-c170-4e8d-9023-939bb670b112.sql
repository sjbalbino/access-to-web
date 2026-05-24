DROP INDEX IF EXISTS public.contas_pagar_tenant_codigo_legado_uq;
DROP INDEX IF EXISTS public.contas_receber_tenant_codigo_legado_uq;

CREATE UNIQUE INDEX contas_pagar_tenant_codigo_legado_uq
  ON public.contas_pagar (tenant_id, codigo_legado);

CREATE UNIQUE INDEX contas_receber_tenant_codigo_legado_uq
  ON public.contas_receber (tenant_id, codigo_legado);