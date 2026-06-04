-- 1. Remove contas "modelo" (com pontos) para evitar duplicidade com as importadas
DELETE FROM public.dre_contas WHERE codigo LIKE '%.%';

-- 2. Garante que os níveis estão corretos para as contas sem pontos
UPDATE public.dre_contas SET nivel = 1 WHERE length(codigo) = 2;
UPDATE public.dre_contas SET nivel = 2 WHERE length(codigo) = 4;
UPDATE public.dre_contas SET nivel = 3 WHERE length(codigo) = 7;

-- 3. Reconstrói a hierarquia (parent_id) baseada nos prefixos dos códigos
-- Nível 2 (ex: 0101) aponta para Nível 1 (ex: 01)
UPDATE public.dre_contas t2
SET parent_id = (
  SELECT t1.id 
  FROM public.dre_contas t1 
  WHERE t1.codigo = substring(t2.codigo from 1 for 2) 
    AND t1.tenant_id = t2.tenant_id 
    AND length(t1.codigo) = 2
)
WHERE length(codigo) = 4 AND parent_id IS NULL;

-- Nível 3 (ex: 0101001) aponta para Nível 2 (ex: 0101)
UPDATE public.dre_contas t3
SET parent_id = (
  SELECT t2.id 
  FROM public.dre_contas t2 
  WHERE t2.codigo = substring(t3.codigo from 1 for 4) 
    AND t2.tenant_id = t3.tenant_id 
    AND length(t2.codigo) = 4
)
WHERE length(codigo) = 7 AND parent_id IS NULL;

-- 4. Vincula os lançamentos financeiros existentes às contas DRE corretas
-- baseado no codigo_dre informado no sub-centro de custo
UPDATE public.lancamentos_financeiros lf
SET dre_conta_id = dc.id
FROM public.sub_centros_custo scc
JOIN public.dre_contas dc ON dc.codigo = scc.codigo_dre AND dc.tenant_id = scc.tenant_id
WHERE lf.sub_centro_custo_id = scc.id 
  AND lf.dre_conta_id IS NULL;
