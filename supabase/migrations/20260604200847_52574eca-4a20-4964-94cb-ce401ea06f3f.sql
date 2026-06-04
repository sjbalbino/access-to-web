-- Remove duplicatas mantendo apenas o registro mais antigo
DELETE FROM public.grupos_produtos a
USING public.grupos_produtos b
WHERE a.id > b.id
  AND a.tenant_id = b.tenant_id
  AND a.nome = b.nome;

-- Adiciona restrição de unicidade para permitir upsert por nome dentro do tenant
ALTER TABLE public.grupos_produtos
ADD CONSTRAINT grupos_produtos_tenant_nome_key UNIQUE (tenant_id, nome);
