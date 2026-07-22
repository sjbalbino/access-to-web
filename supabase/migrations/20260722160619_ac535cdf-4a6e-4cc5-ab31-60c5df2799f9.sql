
WITH nfe_por_cfop AS (
  SELECT DISTINCT nf.id, nf.granja_id, nf.dest_cpf_cnpj, nf.total_nota,
         nf.data_emissao::date AS data_emissao, i.cfop
  FROM public.notas_fiscais nf
  JOIN public.notas_fiscais_itens i ON i.nota_fiscal_id = nf.id
  WHERE nf.status IN ('autorizada','autorizado')
),
compras_cand AS (
  SELECT c.id AS compra_id, nf.id AS nota_id
  FROM public.compras_cereais c
  JOIN public.inscricoes_produtor ip ON ip.id = c.inscricao_vendedor_id
  JOIN nfe_por_cfop nf
    ON nf.granja_id = c.granja_id
   AND nf.cfop IN ('1101','1102','2101','2102')
   AND regexp_replace(COALESCE(nf.dest_cpf_cnpj,''), '\D', '', 'g')
       = regexp_replace(COALESCE(ip.cpf_cnpj,''), '\D', '', 'g')
   AND ABS(nf.total_nota - c.valor_total) <= 0.01
   AND nf.data_emissao BETWEEN c.data_compra - INTERVAL '3 days' AND c.data_compra + INTERVAL '3 days'
  WHERE c.nota_fiscal_id IS NULL
    AND c.status = 'pendente'
),
compras_match AS (
  SELECT compra_id, MAX(nota_id::text)::uuid AS nota_id, COUNT(*) AS n
  FROM compras_cand
  GROUP BY compra_id
)
UPDATE public.compras_cereais c
   SET nota_fiscal_id = m.nota_id,
       status = 'nfe_emitida',
       updated_at = now()
  FROM compras_match m
 WHERE c.id = m.compra_id
   AND m.n = 1;

WITH nfe_por_cfop AS (
  SELECT DISTINCT nf.id, nf.granja_id, nf.dest_cpf_cnpj, nf.total_nota,
         nf.data_emissao::date AS data_emissao, i.cfop
  FROM public.notas_fiscais nf
  JOIN public.notas_fiscais_itens i ON i.nota_fiscal_id = nf.id
  WHERE nf.status IN ('autorizada','autorizado')
),
dev_cand AS (
  SELECT d.id AS dev_id, nf.id AS nota_id
  FROM public.devolucoes_deposito d
  JOIN public.inscricoes_produtor ip ON ip.id = d.inscricao_produtor_id
  JOIN nfe_por_cfop nf
    ON nf.granja_id = d.granja_id
   AND nf.cfop IN ('1905','2905')
   AND regexp_replace(COALESCE(nf.dest_cpf_cnpj,''), '\D', '', 'g')
       = regexp_replace(COALESCE(ip.cpf_cnpj,''), '\D', '', 'g')
   AND ABS(nf.total_nota - d.valor_total) <= 0.01
   AND nf.data_emissao BETWEEN d.data_devolucao - INTERVAL '3 days' AND d.data_devolucao + INTERVAL '3 days'
  WHERE d.nota_fiscal_id IS NULL
    AND d.status = 'pendente'
),
dev_match AS (
  SELECT dev_id, MAX(nota_id::text)::uuid AS nota_id, COUNT(*) AS n
  FROM dev_cand
  GROUP BY dev_id
)
UPDATE public.devolucoes_deposito d
   SET nota_fiscal_id = m.nota_id,
       status = 'nfe_emitida',
       updated_at = now()
  FROM dev_match m
 WHERE d.id = m.dev_id
   AND m.n = 1;
