-- Tabela de Devoluções de Depósito (CFOP 5949 - Saída)
CREATE TABLE public.devolucoes_deposito (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo SERIAL,
  granja_id UUID NOT NULL REFERENCES public.granjas(id),
  safra_id UUID NOT NULL REFERENCES public.safras(id),
  inscricao_emitente_id UUID NOT NULL REFERENCES public.inscricoes_produtor(id),
  inscricao_produtor_id UUID NOT NULL REFERENCES public.inscricoes_produtor(id),
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  silo_id UUID REFERENCES public.silos(id),
  data_devolucao DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade_kg NUMERIC(15,3) NOT NULL DEFAULT 0,
  valor_unitario NUMERIC(15,4) DEFAULT 1.0000,
  valor_total NUMERIC(15,2) DEFAULT 0,
  taxa_armazenagem NUMERIC(15,2) DEFAULT 0,
  kg_taxa_armazenagem NUMERIC(15,4) DEFAULT 0,
  inscricao_recebe_taxa_id UUID REFERENCES public.inscricoes_produtor(id),
  nota_fiscal_id UUID REFERENCES public.notas_fiscais(id),
  status VARCHAR(50) DEFAULT 'pendente',
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para devolucoes_deposito
CREATE INDEX idx_devolucoes_deposito_granja ON public.devolucoes_deposito(granja_id);
CREATE INDEX idx_devolucoes_deposito_safra ON public.devolucoes_deposito(safra_id);
CREATE INDEX idx_devolucoes_deposito_produtor ON public.devolucoes_deposito(inscricao_produtor_id);
CREATE INDEX idx_devolucoes_deposito_emitente ON public.devolucoes_deposito(inscricao_emitente_id);

-- RLS para devolucoes_deposito
ALTER TABLE public.devolucoes_deposito ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem devoluções do seu tenant" ON public.devolucoes_deposito
  FOR SELECT USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores podem inserir devoluções" ON public.devolucoes_deposito
  FOR INSERT WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores podem atualizar devoluções" ON public.devolucoes_deposito
  FOR UPDATE USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores podem excluir devoluções" ON public.devolucoes_deposito
  FOR DELETE USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

-- Tabela de Compras de Cereais (CFOP 1102 - Entrada)
CREATE TABLE public.compras_cereais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo SERIAL,
  granja_id UUID NOT NULL REFERENCES public.granjas(id),
  safra_id UUID NOT NULL REFERENCES public.safras(id),
  inscricao_comprador_id UUID NOT NULL REFERENCES public.inscricoes_produtor(id),
  inscricao_vendedor_id UUID NOT NULL REFERENCES public.inscricoes_produtor(id),
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  silo_id UUID REFERENCES public.silos(id),
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade_kg NUMERIC(15,3) NOT NULL DEFAULT 0,
  valor_unitario_kg NUMERIC(15,4) NOT NULL DEFAULT 0,
  valor_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  devolucao_id UUID REFERENCES public.devolucoes_deposito(id),
  nota_fiscal_id UUID REFERENCES public.notas_fiscais(id),
  status VARCHAR(50) DEFAULT 'pendente',
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para compras_cereais
CREATE INDEX idx_compras_cereais_granja ON public.compras_cereais(granja_id);
CREATE INDEX idx_compras_cereais_safra ON public.compras_cereais(safra_id);
CREATE INDEX idx_compras_cereais_comprador ON public.compras_cereais(inscricao_comprador_id);
CREATE INDEX idx_compras_cereais_vendedor ON public.compras_cereais(inscricao_vendedor_id);

-- RLS para compras_cereais
ALTER TABLE public.compras_cereais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem compras do seu tenant" ON public.compras_cereais
  FOR SELECT USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores podem inserir compras" ON public.compras_cereais
  FOR INSERT WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores podem atualizar compras" ON public.compras_cereais
  FOR UPDATE USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores podem excluir compras" ON public.compras_cereais
  FOR DELETE USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));