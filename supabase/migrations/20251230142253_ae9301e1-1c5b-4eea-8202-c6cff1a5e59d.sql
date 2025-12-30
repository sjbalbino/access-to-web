-- Criar tabela para notas referenciadas vinculadas diretamente à compra
CREATE TABLE public.compras_cereais_notas_referenciadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID NOT NULL REFERENCES public.compras_cereais(id) ON DELETE CASCADE,
  tipo VARCHAR NOT NULL CHECK (tipo IN ('nfe', 'nfp')),
  chave_nfe VARCHAR,
  nfp_uf VARCHAR,
  nfp_aamm VARCHAR,
  nfp_cnpj VARCHAR,
  nfp_cpf VARCHAR,
  nfp_ie VARCHAR,
  nfp_modelo VARCHAR DEFAULT '04',
  nfp_serie VARCHAR,
  nfp_numero VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.compras_cereais_notas_referenciadas ENABLE ROW LEVEL SECURITY;

-- Policy SELECT
CREATE POLICY "Usuários veem notas ref de compras do seu tenant"
ON public.compras_cereais_notas_referenciadas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.compras_cereais c 
    WHERE c.id = compra_id AND granja_belongs_to_tenant(c.granja_id)
  )
);

-- Policy INSERT
CREATE POLICY "Operadores podem inserir notas ref de compras"
ON public.compras_cereais_notas_referenciadas
FOR INSERT
WITH CHECK (
  can_edit(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.compras_cereais c 
    WHERE c.id = compra_id AND granja_belongs_to_tenant(c.granja_id)
  )
);

-- Policy DELETE
CREATE POLICY "Operadores podem excluir notas ref de compras"
ON public.compras_cereais_notas_referenciadas
FOR DELETE
USING (
  can_edit(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.compras_cereais c 
    WHERE c.id = compra_id AND granja_belongs_to_tenant(c.granja_id)
  )
);