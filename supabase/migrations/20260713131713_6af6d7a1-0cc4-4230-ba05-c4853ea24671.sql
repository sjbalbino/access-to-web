
-- 1) Zerar codigo em duplicatas (manter o mais antigo)
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY granja_id, codigo ORDER BY created_at, id) AS rn
  FROM public.inscricoes_produtor
  WHERE codigo IS NOT NULL
)
UPDATE public.inscricoes_produtor ip
SET codigo = NULL
FROM ranked r
WHERE ip.id = r.id AND r.rn > 1;

-- 2) Índice único parcial (granja_id, codigo)
CREATE UNIQUE INDEX IF NOT EXISTS inscricoes_produtor_granja_codigo_uniq
  ON public.inscricoes_produtor (granja_id, codigo)
  WHERE codigo IS NOT NULL;
