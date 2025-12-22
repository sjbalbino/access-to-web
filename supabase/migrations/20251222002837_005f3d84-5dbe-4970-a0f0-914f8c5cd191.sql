-- Tabela para armazenar duplicatas de cobrança da NFe
CREATE TABLE public.notas_fiscais_duplicatas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_fiscal_id UUID NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  numero VARCHAR(60),
  data_vencimento DATE,
  valor NUMERIC(15,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notas_fiscais_duplicatas ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (seguindo o padrão das outras tabelas de notas fiscais)
CREATE POLICY "Usuários veem duplicatas de notas do seu tenant" 
ON public.notas_fiscais_duplicatas 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM notas_fiscais nf
  WHERE nf.id = notas_fiscais_duplicatas.nota_fiscal_id 
  AND granja_belongs_to_tenant(nf.granja_id)
));

CREATE POLICY "Operadores podem inserir duplicatas" 
ON public.notas_fiscais_duplicatas 
FOR INSERT 
WITH CHECK (can_edit(auth.uid()) AND EXISTS (
  SELECT 1 FROM notas_fiscais nf
  WHERE nf.id = notas_fiscais_duplicatas.nota_fiscal_id 
  AND granja_belongs_to_tenant(nf.granja_id)
));

CREATE POLICY "Operadores podem atualizar duplicatas" 
ON public.notas_fiscais_duplicatas 
FOR UPDATE 
USING (can_edit(auth.uid()) AND EXISTS (
  SELECT 1 FROM notas_fiscais nf
  WHERE nf.id = notas_fiscais_duplicatas.nota_fiscal_id 
  AND granja_belongs_to_tenant(nf.granja_id)
));

CREATE POLICY "Operadores podem excluir duplicatas" 
ON public.notas_fiscais_duplicatas 
FOR DELETE 
USING (can_edit(auth.uid()) AND EXISTS (
  SELECT 1 FROM notas_fiscais nf
  WHERE nf.id = notas_fiscais_duplicatas.nota_fiscal_id 
  AND granja_belongs_to_tenant(nf.granja_id)
));

-- Índice para busca rápida por nota fiscal
CREATE INDEX idx_notas_fiscais_duplicatas_nota_fiscal_id ON public.notas_fiscais_duplicatas(nota_fiscal_id);