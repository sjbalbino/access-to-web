-- Resetar ordem para todas as contas para que a ordenação pelo código (alfabética) funcione corretamente
UPDATE dre_contas SET ordem = 0;

-- Corrigir tipo de saldo para Receitas (Grupo 01)
UPDATE dre_contas 
SET tipo_saldo = 'credito' 
WHERE (codigo = '01' OR codigo LIKE '01%')
AND descricao NOT ILIKE '%(-)%'
AND descricao NOT ILIKE '%Imposto%'
AND descricao NOT ILIKE '%Dedução%'
AND descricao NOT ILIKE '%Devolução%';

-- Garantir que as deduções dentro do grupo de receita permaneçam como débito
UPDATE dre_contas 
SET tipo_saldo = 'debito' 
WHERE (codigo LIKE '01%')
AND (descricao ILIKE '%(-)%' OR descricao ILIKE '%Imposto%' OR descricao ILIKE '%Dedução%' OR descricao ILIKE '%Devolução%');

-- Se houver uma conta específica de Lucro/Prejuízo Líquido (Grupo 19 no screenshot), 
-- vamos garantir que ela tenha uma ordem maior para ficar ao final se necessário, 
-- ou simplesmente confiar no código '19' vindo após '01'.
-- Mas no screenshot '01' estava vindo após '19', o que indica que '19' tinha ordem 0 e '01' tinha ordem 1.
-- Ao resetar tudo para 0, '01' virá antes de '19'.
