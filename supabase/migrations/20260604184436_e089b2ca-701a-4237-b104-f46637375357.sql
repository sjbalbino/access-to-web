-- Atualiza contas de Receita para Crédito baseado no nome
UPDATE dre_contas 
SET tipo_saldo = 'credito' 
WHERE (descricao ILIKE '%RECEITA%' OR descricao ILIKE '%VENDA%')
AND descricao NOT ILIKE '%(-)%'
AND descricao NOT ILIKE '%Imposto%'
AND descricao NOT ILIKE '%Dedução%'
AND descricao NOT ILIKE '%Devolução%'
AND descricao NOT ILIKE '%Despesa%';
