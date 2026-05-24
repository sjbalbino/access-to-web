-- 1. Limpar duplicados de contas_pagar para tenant UMBU AGROPECUARIA
WITH dups AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY tenant_id, codigo_legado ORDER BY created_at ASC, id ASC) AS rn
  FROM public.contas_pagar
  WHERE tenant_id = '72db48ef-f71c-4b8f-85a1-46012d17dd64'
    AND codigo_legado IS NOT NULL
),
to_del AS (
  SELECT id FROM dups WHERE rn > 1
)
DELETE FROM public.contas_pagar_baixas WHERE conta_id IN (SELECT id FROM to_del);

WITH dups AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY tenant_id, codigo_legado ORDER BY created_at ASC, id ASC) AS rn
  FROM public.contas_pagar
  WHERE tenant_id = '72db48ef-f71c-4b8f-85a1-46012d17dd64'
    AND codigo_legado IS NOT NULL
)
DELETE FROM public.contas_pagar WHERE id IN (SELECT id FROM dups WHERE rn > 1);

-- 2. Mesmo tratamento para contas_receber (defensivo)
WITH dups AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY tenant_id, codigo_legado ORDER BY created_at ASC, id ASC) AS rn
  FROM public.contas_receber
  WHERE tenant_id = '72db48ef-f71c-4b8f-85a1-46012d17dd64'
    AND codigo_legado IS NOT NULL
),
to_del AS (
  SELECT id FROM dups WHERE rn > 1
)
DELETE FROM public.contas_receber_baixas WHERE conta_id IN (SELECT id FROM to_del);

WITH dups AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY tenant_id, codigo_legado ORDER BY created_at ASC, id ASC) AS rn
  FROM public.contas_receber
  WHERE tenant_id = '72db48ef-f71c-4b8f-85a1-46012d17dd64'
    AND codigo_legado IS NOT NULL
)
DELETE FROM public.contas_receber WHERE id IN (SELECT id FROM dups WHERE rn > 1);

-- 3. Índices únicos parciais para bloquear duplicados futuros
CREATE UNIQUE INDEX IF NOT EXISTS contas_pagar_tenant_codigo_legado_uq
  ON public.contas_pagar (tenant_id, codigo_legado)
  WHERE codigo_legado IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contas_receber_tenant_codigo_legado_uq
  ON public.contas_receber (tenant_id, codigo_legado)
  WHERE codigo_legado IS NOT NULL;