UPDATE public.colheitas c
SET safra_id = cl.safra_id
FROM public.controle_lavouras cl
WHERE c.controle_lavoura_id = cl.id
  AND (c.safra_id IS NULL OR c.safra_id <> cl.safra_id)
  AND cl.safra_id IS NOT NULL;