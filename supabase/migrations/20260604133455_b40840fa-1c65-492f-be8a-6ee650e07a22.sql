-- Remove duplicates keeping only one record per code/tenant
DELETE FROM public.dre_contas a 
USING public.dre_contas b 
WHERE a.id < b.id 
  AND a.tenant_id = b.tenant_id 
  AND a.codigo = b.codigo;

-- Add unique constraint
ALTER TABLE public.dre_contas ADD CONSTRAINT dre_contas_tenant_codigo_key UNIQUE (tenant_id, codigo);
