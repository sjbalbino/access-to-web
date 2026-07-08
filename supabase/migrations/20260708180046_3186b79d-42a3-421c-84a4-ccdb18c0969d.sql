
WITH duplicados AS (
  SELECT id, safra_id, created_at,
         ROW_NUMBER() OVER (PARTITION BY safra_id ORDER BY created_at) AS rn
  FROM public.contratos_venda
  WHERE numero = '100'
),
maximos AS (
  SELECT safra_id,
         MAX(CASE WHEN numero ~ '^[0-9]+$' AND id NOT IN (SELECT id FROM duplicados)
                  THEN numero::int ELSE 0 END) AS max_num
  FROM public.contratos_venda
  GROUP BY safra_id
)
UPDATE public.contratos_venda cv
SET numero = (m.max_num + d.rn)::text
FROM duplicados d
JOIN maximos m ON m.safra_id = d.safra_id
WHERE cv.id = d.id;
