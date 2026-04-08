
-- Tabela de cabeçalho das entradas de NF-e
CREATE TABLE public.entradas_nfe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  granja_id UUID NOT NULL REFERENCES public.granjas(id),
  fornecedor_id UUID REFERENCES public.clientes_fornecedores(id),
  numero_nfe CHARACTER VARYING,
  serie CHARACTER VARYING DEFAULT '1',
  chave_acesso CHARACTER VARYING,
  data_emissao DATE,
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  cfop_id UUID REFERENCES public.cfops(id),
  natureza_operacao CHARACTER VARYING,
  valor_produtos NUMERIC DEFAULT 0,
  valor_frete NUMERIC DEFAULT 0,
  valor_seguro NUMERIC DEFAULT 0,
  valor_desconto NUMERIC DEFAULT 0,
  valor_outras_despesas NUMERIC DEFAULT 0,
  valor_ipi NUMERIC DEFAULT 0,
  valor_icms NUMERIC DEFAULT 0,
  valor_icms_st NUMERIC DEFAULT 0,
  valor_pis NUMERIC DEFAULT 0,
  valor_cofins NUMERIC DEFAULT 0,
  valor_total NUMERIC DEFAULT 0,
  modo_entrada CHARACTER VARYING NOT NULL DEFAULT 'manual',
  status CHARACTER VARYING NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  xml_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.entradas_nfe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem entradas do seu tenant"
  ON public.entradas_nfe FOR SELECT
  USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores podem inserir entradas"
  ON public.entradas_nfe FOR INSERT
  WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores podem atualizar entradas"
  ON public.entradas_nfe FOR UPDATE
  USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores podem excluir entradas"
  ON public.entradas_nfe FOR DELETE
  USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE TRIGGER update_entradas_nfe_updated_at
  BEFORE UPDATE ON public.entradas_nfe
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de itens das entradas de NF-e
CREATE TABLE public.entradas_nfe_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entrada_nfe_id UUID NOT NULL REFERENCES public.entradas_nfe(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id),
  produto_xml_codigo CHARACTER VARYING,
  produto_xml_descricao CHARACTER VARYING,
  produto_xml_ncm CHARACTER VARYING,
  cfop CHARACTER VARYING,
  unidade_medida CHARACTER VARYING,
  quantidade NUMERIC DEFAULT 0,
  valor_unitario NUMERIC DEFAULT 0,
  valor_total NUMERIC DEFAULT 0,
  valor_desconto NUMERIC DEFAULT 0,
  valor_frete_rateio NUMERIC DEFAULT 0,
  cst_icms CHARACTER VARYING,
  base_icms NUMERIC DEFAULT 0,
  aliq_icms NUMERIC DEFAULT 0,
  valor_icms NUMERIC DEFAULT 0,
  cst_ipi CHARACTER VARYING,
  base_ipi NUMERIC DEFAULT 0,
  aliq_ipi NUMERIC DEFAULT 0,
  valor_ipi NUMERIC DEFAULT 0,
  cst_pis CHARACTER VARYING,
  base_pis NUMERIC DEFAULT 0,
  aliq_pis NUMERIC DEFAULT 0,
  valor_pis NUMERIC DEFAULT 0,
  cst_cofins CHARACTER VARYING,
  base_cofins NUMERIC DEFAULT 0,
  aliq_cofins NUMERIC DEFAULT 0,
  valor_cofins NUMERIC DEFAULT 0,
  lote CHARACTER VARYING,
  data_validade DATE,
  vinculado BOOLEAN DEFAULT false,
  quantidade_conferida NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.entradas_nfe_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem itens de entradas do seu tenant"
  ON public.entradas_nfe_itens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.entradas_nfe e
    WHERE e.id = entradas_nfe_itens.entrada_nfe_id
    AND granja_belongs_to_tenant(e.granja_id)
  ));

CREATE POLICY "Operadores podem inserir itens de entradas"
  ON public.entradas_nfe_itens FOR INSERT
  WITH CHECK (can_edit(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.entradas_nfe e
    WHERE e.id = entradas_nfe_itens.entrada_nfe_id
    AND granja_belongs_to_tenant(e.granja_id)
  ));

CREATE POLICY "Operadores podem atualizar itens de entradas"
  ON public.entradas_nfe_itens FOR UPDATE
  USING (can_edit(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.entradas_nfe e
    WHERE e.id = entradas_nfe_itens.entrada_nfe_id
    AND granja_belongs_to_tenant(e.granja_id)
  ));

CREATE POLICY "Operadores podem excluir itens de entradas"
  ON public.entradas_nfe_itens FOR DELETE
  USING (can_edit(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.entradas_nfe e
    WHERE e.id = entradas_nfe_itens.entrada_nfe_id
    AND granja_belongs_to_tenant(e.granja_id)
  ));

CREATE TRIGGER update_entradas_nfe_itens_updated_at
  BEFORE UPDATE ON public.entradas_nfe_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
