WITH colheitas_ie AS (
  SELECT c.id, c.inscricao_produtor_id AS inscricao_atual, ip.inscricao_estadual
  FROM public.colheitas c
  JOIN public.inscricoes_produtor ip ON ip.id = c.inscricao_produtor_id
  WHERE c.inscricao_produtor_id IS NOT NULL
), destino AS (
  SELECT ci.id AS colheita_id, ip2.id AS nova_inscricao_id
  FROM colheitas_ie ci
  JOIN public.inscricoes_produtor ip2 ON ip2.inscricao_estadual = ci.inscricao_estadual
  WHERE ip2.id <> ci.inscricao_atual
)
UPDATE public.colheitas c
SET inscricao_produtor_id = d.nova_inscricao_id
FROM destino d
WHERE c.id = d.colheita_id;