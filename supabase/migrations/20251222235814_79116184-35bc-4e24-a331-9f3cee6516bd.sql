-- Tabela de transferências de depósito entre produtores
CREATE TABLE transferencias_deposito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo SERIAL NOT NULL,
  data_transferencia DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Origem (quem transfere)
  granja_origem_id UUID REFERENCES granjas(id),
  inscricao_origem_id UUID REFERENCES inscricoes_produtor(id),
  
  -- Destino (quem recebe)  
  granja_destino_id UUID REFERENCES granjas(id),
  inscricao_destino_id UUID REFERENCES inscricoes_produtor(id),
  
  -- Produto/Quantidade
  safra_id UUID REFERENCES safras(id),
  produto_id UUID REFERENCES produtos(id),
  silo_id UUID REFERENCES silos(id),
  quantidade_kg NUMERIC NOT NULL DEFAULT 0,
  
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de notas de depósito emitidas (CFOP 1905)
CREATE TABLE notas_deposito_emitidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_fiscal_id UUID REFERENCES notas_fiscais(id),
  granja_id UUID REFERENCES granjas(id),
  inscricao_produtor_id UUID REFERENCES inscricoes_produtor(id),
  safra_id UUID REFERENCES safras(id),
  produto_id UUID REFERENCES produtos(id),
  quantidade_kg NUMERIC NOT NULL DEFAULT 0,
  data_emissao DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de notas fiscais referenciadas (NFe ou NFP do produtor)
CREATE TABLE notas_fiscais_referenciadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_fiscal_id UUID NOT NULL REFERENCES notas_fiscais(id) ON DELETE CASCADE,
  tipo VARCHAR NOT NULL DEFAULT 'nfe', -- 'nfe' ou 'nfp'
  
  -- Para NFe (modelo 55)
  chave_nfe VARCHAR(44),
  
  -- Para NFP (Nota Fiscal Produtor - modelo 04)
  nfp_uf VARCHAR(2),
  nfp_aamm VARCHAR(4), -- Ano/Mês no formato AAMM
  nfp_cnpj VARCHAR(14),
  nfp_cpf VARCHAR(11),
  nfp_ie VARCHAR(14),
  nfp_modelo VARCHAR(2) DEFAULT '04',
  nfp_serie INTEGER,
  nfp_numero INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE transferencias_deposito ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_deposito_emitidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais_referenciadas ENABLE ROW LEVEL SECURITY;

-- Políticas para transferencias_deposito
CREATE POLICY "Usuários veem transferências do seu tenant"
ON transferencias_deposito FOR SELECT
USING (granja_belongs_to_tenant(granja_origem_id) OR granja_belongs_to_tenant(granja_destino_id));

CREATE POLICY "Operadores podem inserir transferências"
ON transferencias_deposito FOR INSERT
WITH CHECK (can_edit(auth.uid()) AND (granja_belongs_to_tenant(granja_origem_id) OR granja_belongs_to_tenant(granja_destino_id)));

CREATE POLICY "Operadores podem atualizar transferências"
ON transferencias_deposito FOR UPDATE
USING (can_edit(auth.uid()) AND (granja_belongs_to_tenant(granja_origem_id) OR granja_belongs_to_tenant(granja_destino_id)));

CREATE POLICY "Operadores podem excluir transferências"
ON transferencias_deposito FOR DELETE
USING (can_edit(auth.uid()) AND (granja_belongs_to_tenant(granja_origem_id) OR granja_belongs_to_tenant(granja_destino_id)));

-- Políticas para notas_deposito_emitidas
CREATE POLICY "Usuários veem notas de depósito do seu tenant"
ON notas_deposito_emitidas FOR SELECT
USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores podem inserir notas de depósito"
ON notas_deposito_emitidas FOR INSERT
WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores podem atualizar notas de depósito"
ON notas_deposito_emitidas FOR UPDATE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores podem excluir notas de depósito"
ON notas_deposito_emitidas FOR DELETE
USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

-- Políticas para notas_fiscais_referenciadas
CREATE POLICY "Usuários veem notas referenciadas de notas do seu tenant"
ON notas_fiscais_referenciadas FOR SELECT
USING (EXISTS (
  SELECT 1 FROM notas_fiscais nf
  WHERE nf.id = notas_fiscais_referenciadas.nota_fiscal_id
  AND granja_belongs_to_tenant(nf.granja_id)
));

CREATE POLICY "Operadores podem inserir notas referenciadas"
ON notas_fiscais_referenciadas FOR INSERT
WITH CHECK (can_edit(auth.uid()) AND EXISTS (
  SELECT 1 FROM notas_fiscais nf
  WHERE nf.id = notas_fiscais_referenciadas.nota_fiscal_id
  AND granja_belongs_to_tenant(nf.granja_id)
));

CREATE POLICY "Operadores podem atualizar notas referenciadas"
ON notas_fiscais_referenciadas FOR UPDATE
USING (can_edit(auth.uid()) AND EXISTS (
  SELECT 1 FROM notas_fiscais nf
  WHERE nf.id = notas_fiscais_referenciadas.nota_fiscal_id
  AND granja_belongs_to_tenant(nf.granja_id)
));

CREATE POLICY "Operadores podem excluir notas referenciadas"
ON notas_fiscais_referenciadas FOR DELETE
USING (can_edit(auth.uid()) AND EXISTS (
  SELECT 1 FROM notas_fiscais nf
  WHERE nf.id = notas_fiscais_referenciadas.nota_fiscal_id
  AND granja_belongs_to_tenant(nf.granja_id)
));

-- Triggers para updated_at
CREATE TRIGGER update_transferencias_deposito_updated_at
BEFORE UPDATE ON transferencias_deposito
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular saldo de depósito por inscrição/produto/safra
-- Saldo = Colheitas + Transferências Recebidas - Notas de Depósito Emitidas
CREATE OR REPLACE FUNCTION calcular_saldo_deposito(
  p_inscricao_id UUID,
  p_produto_id UUID,
  p_safra_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_depositado NUMERIC := 0;
  v_transf_recebidas NUMERIC := 0;
  v_notas_emitidas NUMERIC := 0;
BEGIN
  -- Total depositado (colheitas)
  SELECT COALESCE(SUM(producao_liquida_kg), 0) INTO v_depositado
  FROM colheitas
  WHERE inscricao_produtor_id = p_inscricao_id
    AND variedade_id = p_produto_id
    AND safra_id = p_safra_id;
  
  -- Transferências recebidas (apenas entrada)
  SELECT COALESCE(SUM(quantidade_kg), 0) INTO v_transf_recebidas
  FROM transferencias_deposito
  WHERE inscricao_destino_id = p_inscricao_id
    AND produto_id = p_produto_id
    AND safra_id = p_safra_id;
  
  -- Notas de depósito emitidas
  SELECT COALESCE(SUM(quantidade_kg), 0) INTO v_notas_emitidas
  FROM notas_deposito_emitidas
  WHERE inscricao_produtor_id = p_inscricao_id
    AND produto_id = p_produto_id
    AND safra_id = p_safra_id;
  
  -- Saldo = Colheita + Transf.Recebidas - Notas Emitidas
  RETURN v_depositado + v_transf_recebidas - v_notas_emitidas;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;