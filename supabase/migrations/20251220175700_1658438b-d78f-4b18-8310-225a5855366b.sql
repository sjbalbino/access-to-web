-- =============================================
-- TABELA: contratos_venda
-- Contratos de venda de produção agrícola
-- =============================================
CREATE TABLE public.contratos_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  granja_id UUID REFERENCES public.granjas(id),
  numero INTEGER NOT NULL,
  safra_id UUID REFERENCES public.safras(id),
  produto_id UUID REFERENCES public.produtos(id),
  data_contrato DATE NOT NULL,
  nota_venda VARCHAR(50),
  numero_contrato_comprador VARCHAR(50),
  
  -- Vendedor (Produtor Parceiro)
  inscricao_produtor_id UUID REFERENCES public.inscricoes_produtor(id),
  
  -- Comprador
  comprador_id UUID REFERENCES public.clientes_fornecedores(id),
  tipo_venda VARCHAR(20) DEFAULT 'industria',
  
  -- Quantidades e Valores
  quantidade_kg NUMERIC DEFAULT 0,
  quantidade_sacos NUMERIC DEFAULT 0,
  preco_kg NUMERIC(15,10) DEFAULT 0,
  valor_total NUMERIC DEFAULT 0,
  
  -- Local de Entrega (pré-preenchido do comprador, editável)
  local_entrega_nome VARCHAR(200),
  local_entrega_cnpj_cpf VARCHAR(20),
  local_entrega_ie VARCHAR(20),
  local_entrega_logradouro VARCHAR(200),
  local_entrega_numero VARCHAR(20),
  local_entrega_complemento VARCHAR(100),
  local_entrega_bairro VARCHAR(100),
  local_entrega_cidade VARCHAR(100),
  local_entrega_uf VARCHAR(2),
  local_entrega_cep VARCHAR(10),
  
  -- Corretor (opcional)
  corretor VARCHAR(100),
  percentual_comissao NUMERIC DEFAULT 0,
  valor_comissao NUMERIC DEFAULT 0,
  data_pagamento_comissao DATE,
  
  -- Flags
  modalidade_frete INTEGER DEFAULT 0,
  venda_entrega_futura BOOLEAN DEFAULT false,
  a_fixar BOOLEAN DEFAULT false,
  fechada BOOLEAN DEFAULT false,
  
  -- Controle
  data_recebimento DATE,
  observacoes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TABELA: remessas_venda
-- Remessas/carregamentos vinculados aos contratos
-- =============================================
CREATE TABLE public.remessas_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_venda_id UUID NOT NULL REFERENCES public.contratos_venda(id) ON DELETE CASCADE,
  codigo INTEGER,
  data_remessa DATE NOT NULL,
  
  -- Pesagem
  placa_id UUID REFERENCES public.placas(id),
  peso_bruto NUMERIC DEFAULT 0,
  peso_tara NUMERIC DEFAULT 0,
  peso_liquido NUMERIC DEFAULT 0,
  
  -- Variedade e Qualidade
  variedade_id UUID REFERENCES public.produtos(id),
  silo_id UUID REFERENCES public.silos(id),
  ph NUMERIC DEFAULT 0,
  umidade NUMERIC DEFAULT 0,
  impureza NUMERIC DEFAULT 0,
  
  -- Kgs e Descontos
  kg_remessa NUMERIC DEFAULT 0,
  kg_desconto_umidade NUMERIC DEFAULT 0,
  kg_desconto_impureza NUMERIC DEFAULT 0,
  kg_nota NUMERIC DEFAULT 0,
  sacos NUMERIC DEFAULT 0,
  
  -- Valores
  preco_kg NUMERIC(15,10) DEFAULT 0,
  valor_remessa NUMERIC DEFAULT 0,
  valor_nota NUMERIC DEFAULT 0,
  
  -- Transportador
  transportadora_id UUID REFERENCES public.transportadoras(id),
  motorista VARCHAR(100),
  
  -- Controle NFe
  nota_fiscal_id UUID REFERENCES public.notas_fiscais(id),
  romaneio INTEGER,
  balanceiro VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pendente',
  
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- RLS: contratos_venda
-- =============================================
ALTER TABLE public.contratos_venda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem contratos do seu tenant"
ON public.contratos_venda
FOR SELECT
USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem inserir contratos"
ON public.contratos_venda
FOR INSERT
WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem atualizar contratos"
ON public.contratos_venda
FOR UPDATE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem excluir contratos"
ON public.contratos_venda
FOR DELETE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

-- =============================================
-- RLS: remessas_venda
-- =============================================
ALTER TABLE public.remessas_venda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem remessas do seu tenant"
ON public.remessas_venda
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.contratos_venda cv
  WHERE cv.id = remessas_venda.contrato_venda_id
  AND granja_belongs_to_tenant(cv.granja_id)
));

CREATE POLICY "Operadores podem inserir remessas"
ON public.remessas_venda
FOR INSERT
WITH CHECK (can_edit(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.contratos_venda cv
  WHERE cv.id = remessas_venda.contrato_venda_id
  AND granja_belongs_to_tenant(cv.granja_id)
));

CREATE POLICY "Operadores podem atualizar remessas"
ON public.remessas_venda
FOR UPDATE
USING (can_edit(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.contratos_venda cv
  WHERE cv.id = remessas_venda.contrato_venda_id
  AND granja_belongs_to_tenant(cv.granja_id)
));

CREATE POLICY "Operadores podem excluir remessas"
ON public.remessas_venda
FOR DELETE
USING (can_edit(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.contratos_venda cv
  WHERE cv.id = remessas_venda.contrato_venda_id
  AND granja_belongs_to_tenant(cv.granja_id)
));

-- =============================================
-- TRIGGERS: updated_at
-- =============================================
CREATE TRIGGER update_contratos_venda_updated_at
BEFORE UPDATE ON public.contratos_venda
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_remessas_venda_updated_at
BEFORE UPDATE ON public.remessas_venda
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ÍNDICES para performance
-- =============================================
CREATE INDEX idx_contratos_venda_granja ON public.contratos_venda(granja_id);
CREATE INDEX idx_contratos_venda_safra ON public.contratos_venda(safra_id);
CREATE INDEX idx_contratos_venda_comprador ON public.contratos_venda(comprador_id);
CREATE INDEX idx_remessas_venda_contrato ON public.remessas_venda(contrato_venda_id);
CREATE INDEX idx_remessas_venda_nota ON public.remessas_venda(nota_fiscal_id);