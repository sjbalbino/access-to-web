
-- ===========================================
-- MÓDULO NF-e - ESTRUTURA COMPLETA (NT 2025.002)
-- ===========================================

-- 1. Tabela de CFOPs (Código Fiscal de Operações e Prestações)
CREATE TABLE public.cfops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(4) NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  natureza_operacao VARCHAR(60),
  tipo VARCHAR(20) DEFAULT 'saida', -- entrada, saida, devolucao, transferencia, remessa
  aplicacao VARCHAR(100), -- venda, compra, devolucao, remessa_deposito, etc.
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para cfops
ALTER TABLE public.cfops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública de cfops" ON public.cfops
  FOR SELECT USING (true);

CREATE POLICY "Operadores e admins podem inserir cfops" ON public.cfops
  FOR INSERT WITH CHECK (can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem atualizar cfops" ON public.cfops
  FOR UPDATE USING (can_edit(auth.uid()));

CREATE POLICY "Operadores e admins podem excluir cfops" ON public.cfops
  FOR DELETE USING (can_edit(auth.uid()));

-- Trigger updated_at para cfops
CREATE TRIGGER update_cfops_updated_at
  BEFORE UPDATE ON public.cfops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Tabela de Emitentes NF-e (Configuração por Granja)
CREATE TABLE public.emitentes_nfe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  granja_id UUID REFERENCES public.granjas(id) ON DELETE CASCADE,
  -- Configurações de Emissão
  ambiente INTEGER DEFAULT 2, -- 1=Produção, 2=Homologação
  serie_nfe INTEGER DEFAULT 1,
  numero_atual_nfe INTEGER DEFAULT 0,
  serie_nfce INTEGER DEFAULT 1,
  numero_atual_nfce INTEGER DEFAULT 0,
  -- Regime Tributário
  crt INTEGER DEFAULT 3, -- 1=Simples Nacional, 2=SN Excesso Sublimite, 3=Regime Normal
  -- Configurações Fiscais
  aliq_icms_padrao NUMERIC(5,2) DEFAULT 0,
  aliq_pis_padrao NUMERIC(7,4) DEFAULT 1.65,
  aliq_cofins_padrao NUMERIC(7,4) DEFAULT 7.6,
  -- NT 2025.002 - Alíquotas IBS/CBS/IS
  aliq_ibs_padrao NUMERIC(7,4) DEFAULT 0,
  aliq_cbs_padrao NUMERIC(7,4) DEFAULT 0,
  aliq_is_padrao NUMERIC(7,4) DEFAULT 0,
  -- API Credentials (para integração futura)
  api_provider VARCHAR(50), -- webmania, focusnfe, etc.
  api_consumer_key TEXT,
  api_consumer_secret TEXT,
  api_access_token TEXT,
  api_access_token_secret TEXT,
  api_configurada BOOLEAN DEFAULT false,
  -- Certificado Digital
  certificado_nome VARCHAR(255),
  certificado_validade DATE,
  -- Controle
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(granja_id)
);

-- RLS para emitentes_nfe
ALTER TABLE public.emitentes_nfe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem emitentes do seu tenant" ON public.emitentes_nfe
  FOR SELECT USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem inserir emitentes" ON public.emitentes_nfe
  FOR INSERT WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem atualizar emitentes" ON public.emitentes_nfe
  FOR UPDATE USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem excluir emitentes" ON public.emitentes_nfe
  FOR DELETE USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

-- Trigger updated_at para emitentes_nfe
CREATE TRIGGER update_emitentes_nfe_updated_at
  BEFORE UPDATE ON public.emitentes_nfe
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Tabela de Notas Fiscais
CREATE TABLE public.notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  emitente_id UUID REFERENCES public.emitentes_nfe(id),
  granja_id UUID REFERENCES public.granjas(id),
  -- Identificação
  uuid_api VARCHAR(50),
  numero INTEGER,
  serie INTEGER,
  modelo VARCHAR(2) DEFAULT '55', -- 55=NFe, 65=NFCe
  chave_acesso VARCHAR(44),
  protocolo VARCHAR(17),
  -- Status
  status VARCHAR(20) DEFAULT 'rascunho', -- rascunho, processando, aprovada, rejeitada, cancelada, inutilizada
  motivo_status TEXT,
  -- Datas
  data_emissao TIMESTAMPTZ,
  data_saida_entrada TIMESTAMPTZ,
  -- Operação
  operacao INTEGER DEFAULT 1, -- 0=Entrada, 1=Saída
  natureza_operacao VARCHAR(60) NOT NULL,
  finalidade INTEGER DEFAULT 1, -- 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
  cfop_id UUID REFERENCES public.cfops(id),
  -- Destinatário
  dest_tipo VARCHAR(10), -- PF, PJ, estrangeiro
  dest_cpf_cnpj VARCHAR(14),
  dest_nome VARCHAR(60),
  dest_ie VARCHAR(14),
  dest_isuf VARCHAR(9),
  dest_im VARCHAR(15),
  dest_email VARCHAR(60),
  dest_telefone VARCHAR(14),
  -- Endereço Destinatário
  dest_logradouro VARCHAR(60),
  dest_numero VARCHAR(10),
  dest_complemento VARCHAR(60),
  dest_bairro VARCHAR(60),
  dest_cidade VARCHAR(60),
  dest_uf VARCHAR(2),
  dest_cep VARCHAR(8),
  dest_codigo_municipio VARCHAR(7),
  dest_codigo_pais VARCHAR(4) DEFAULT '1058',
  dest_nome_pais VARCHAR(60) DEFAULT 'BRASIL',
  -- Indicadores
  ind_consumidor_final INTEGER DEFAULT 1, -- 0=Normal, 1=Consumidor Final
  ind_presenca INTEGER DEFAULT 9, -- 0=Não se aplica, 1=Presencial, 9=Internet
  -- Totais Produtos/Serviços
  total_produtos NUMERIC(15,2) DEFAULT 0,
  total_frete NUMERIC(15,2) DEFAULT 0,
  total_seguro NUMERIC(15,2) DEFAULT 0,
  total_desconto NUMERIC(15,2) DEFAULT 0,
  total_outros NUMERIC(15,2) DEFAULT 0,
  total_nota NUMERIC(15,2) DEFAULT 0,
  -- Impostos Federais/Estaduais (atuais)
  total_bc_icms NUMERIC(15,2) DEFAULT 0,
  total_icms NUMERIC(15,2) DEFAULT 0,
  total_bc_icms_st NUMERIC(15,2) DEFAULT 0,
  total_icms_st NUMERIC(15,2) DEFAULT 0,
  total_fcp NUMERIC(15,2) DEFAULT 0,
  total_bc_pis NUMERIC(15,2) DEFAULT 0,
  total_pis NUMERIC(15,2) DEFAULT 0,
  total_bc_cofins NUMERIC(15,2) DEFAULT 0,
  total_cofins NUMERIC(15,2) DEFAULT 0,
  total_bc_ipi NUMERIC(15,2) DEFAULT 0,
  total_ipi NUMERIC(15,2) DEFAULT 0,
  total_ii NUMERIC(15,2) DEFAULT 0,
  -- NT 2025.002 - Novos Tributos IBS/CBS/IS
  total_bc_ibs NUMERIC(15,2) DEFAULT 0,
  total_ibs NUMERIC(15,2) DEFAULT 0,
  total_bc_cbs NUMERIC(15,2) DEFAULT 0,
  total_cbs NUMERIC(15,2) DEFAULT 0,
  total_bc_is NUMERIC(15,2) DEFAULT 0,
  total_is NUMERIC(15,2) DEFAULT 0,
  -- Transporte
  modalidade_frete INTEGER DEFAULT 9, -- 0=Emitente, 1=Destinatário, 2=Terceiros, 9=Sem frete
  transp_cpf_cnpj VARCHAR(14),
  transp_nome VARCHAR(60),
  transp_ie VARCHAR(14),
  transp_endereco VARCHAR(60),
  transp_cidade VARCHAR(60),
  transp_uf VARCHAR(2),
  -- Veículo
  veiculo_placa VARCHAR(7),
  veiculo_uf VARCHAR(2),
  veiculo_rntc VARCHAR(20),
  -- Volumes
  volumes_quantidade INTEGER,
  volumes_especie VARCHAR(60),
  volumes_marca VARCHAR(60),
  volumes_numeracao VARCHAR(60),
  volumes_peso_liquido NUMERIC(15,3),
  volumes_peso_bruto NUMERIC(15,3),
  -- Pagamento
  forma_pagamento INTEGER DEFAULT 0, -- 0=À vista, 1=A prazo
  tipo_pagamento VARCHAR(3) DEFAULT '90', -- 01=Dinheiro, 02=Cheque, 03=Cartão Crédito, etc.
  valor_pagamento NUMERIC(15,2) DEFAULT 0,
  -- Cobrança
  numero_fatura VARCHAR(60),
  valor_original NUMERIC(15,2),
  valor_desconto_fatura NUMERIC(15,2),
  valor_liquido_fatura NUMERIC(15,2),
  -- Referências
  nfe_referenciada VARCHAR(44),
  colheita_id UUID REFERENCES public.colheitas(id),
  cliente_fornecedor_id UUID REFERENCES public.clientes_fornecedores(id),
  produtor_id UUID REFERENCES public.produtores(id),
  inscricao_produtor_id UUID REFERENCES public.inscricoes_produtor(id),
  -- URLs/Arquivos
  xml_url TEXT,
  danfe_url TEXT,
  xml_cancelamento_url TEXT,
  -- Informações Adicionais
  info_complementar TEXT,
  info_fisco TEXT,
  observacoes TEXT,
  -- Controle
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para notas_fiscais
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem notas do seu tenant" ON public.notas_fiscais
  FOR SELECT USING (granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem inserir notas" ON public.notas_fiscais
  FOR INSERT WITH CHECK (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem atualizar notas" ON public.notas_fiscais
  FOR UPDATE USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

CREATE POLICY "Operadores e admins podem excluir notas" ON public.notas_fiscais
  FOR DELETE USING (can_edit(auth.uid()) AND granja_belongs_to_tenant(granja_id));

-- Trigger updated_at para notas_fiscais
CREATE TRIGGER update_notas_fiscais_updated_at
  BEFORE UPDATE ON public.notas_fiscais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_notas_fiscais_tenant ON public.notas_fiscais(tenant_id);
CREATE INDEX idx_notas_fiscais_granja ON public.notas_fiscais(granja_id);
CREATE INDEX idx_notas_fiscais_status ON public.notas_fiscais(status);
CREATE INDEX idx_notas_fiscais_data_emissao ON public.notas_fiscais(data_emissao);
CREATE INDEX idx_notas_fiscais_chave ON public.notas_fiscais(chave_acesso);

-- 4. Tabela de Itens das Notas Fiscais
CREATE TABLE public.notas_fiscais_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_fiscal_id UUID NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  numero_item INTEGER NOT NULL,
  -- Produto
  produto_id UUID REFERENCES public.produtos(id),
  codigo VARCHAR(60),
  descricao VARCHAR(120) NOT NULL,
  ncm VARCHAR(8),
  cest VARCHAR(7),
  cfop VARCHAR(4),
  unidade VARCHAR(6) NOT NULL,
  quantidade NUMERIC(15,4) NOT NULL,
  valor_unitario NUMERIC(21,10) NOT NULL,
  valor_total NUMERIC(15,2) NOT NULL,
  -- Descontos/Acréscimos
  valor_desconto NUMERIC(15,2) DEFAULT 0,
  valor_frete NUMERIC(15,2) DEFAULT 0,
  valor_seguro NUMERIC(15,2) DEFAULT 0,
  valor_outros NUMERIC(15,2) DEFAULT 0,
  -- Origem da Mercadoria
  origem INTEGER DEFAULT 0, -- 0=Nacional, 1=Estrangeira importação direta, etc.
  -- ICMS
  cst_icms VARCHAR(3),
  modalidade_bc_icms INTEGER, -- 0=Margem, 1=Pauta, 2=Preço tabelado, 3=Valor operação
  reducao_bc_icms NUMERIC(5,2) DEFAULT 0,
  base_icms NUMERIC(15,2) DEFAULT 0,
  aliq_icms NUMERIC(5,2) DEFAULT 0,
  valor_icms NUMERIC(15,2) DEFAULT 0,
  -- ICMS ST
  modalidade_bc_icms_st INTEGER,
  mva_icms_st NUMERIC(5,2) DEFAULT 0,
  reducao_bc_icms_st NUMERIC(5,2) DEFAULT 0,
  base_icms_st NUMERIC(15,2) DEFAULT 0,
  aliq_icms_st NUMERIC(5,2) DEFAULT 0,
  valor_icms_st NUMERIC(15,2) DEFAULT 0,
  -- FCP
  base_fcp NUMERIC(15,2) DEFAULT 0,
  aliq_fcp NUMERIC(5,2) DEFAULT 0,
  valor_fcp NUMERIC(15,2) DEFAULT 0,
  -- PIS
  cst_pis VARCHAR(2),
  base_pis NUMERIC(15,2) DEFAULT 0,
  aliq_pis NUMERIC(7,4) DEFAULT 0,
  valor_pis NUMERIC(15,2) DEFAULT 0,
  -- COFINS
  cst_cofins VARCHAR(2),
  base_cofins NUMERIC(15,2) DEFAULT 0,
  aliq_cofins NUMERIC(7,4) DEFAULT 0,
  valor_cofins NUMERIC(15,2) DEFAULT 0,
  -- IPI
  cst_ipi VARCHAR(2),
  base_ipi NUMERIC(15,2) DEFAULT 0,
  aliq_ipi NUMERIC(5,2) DEFAULT 0,
  valor_ipi NUMERIC(15,2) DEFAULT 0,
  -- NT 2025.002 - IBS (Imposto sobre Bens e Serviços)
  cst_ibs VARCHAR(3),
  cclass_trib_ibs VARCHAR(7), -- Código Classificação Tributária IBS
  base_ibs NUMERIC(15,2) DEFAULT 0,
  aliq_ibs NUMERIC(7,4) DEFAULT 0,
  valor_ibs NUMERIC(15,2) DEFAULT 0,
  -- NT 2025.002 - CBS (Contribuição sobre Bens e Serviços)
  cst_cbs VARCHAR(3),
  cclass_trib_cbs VARCHAR(7),
  base_cbs NUMERIC(15,2) DEFAULT 0,
  aliq_cbs NUMERIC(7,4) DEFAULT 0,
  valor_cbs NUMERIC(15,2) DEFAULT 0,
  -- NT 2025.002 - IS (Imposto Seletivo)
  cst_is VARCHAR(3),
  base_is NUMERIC(15,2) DEFAULT 0,
  aliq_is NUMERIC(7,4) DEFAULT 0,
  valor_is NUMERIC(15,2) DEFAULT 0,
  -- Informações Adicionais do Item
  info_adicional TEXT,
  -- Controle
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para notas_fiscais_itens (herda da nota fiscal)
ALTER TABLE public.notas_fiscais_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem itens de notas do seu tenant" ON public.notas_fiscais_itens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.notas_fiscais nf 
      WHERE nf.id = nota_fiscal_id AND granja_belongs_to_tenant(nf.granja_id)
    )
  );

CREATE POLICY "Operadores podem inserir itens de notas" ON public.notas_fiscais_itens
  FOR INSERT WITH CHECK (
    can_edit(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.notas_fiscais nf 
      WHERE nf.id = nota_fiscal_id AND granja_belongs_to_tenant(nf.granja_id)
    )
  );

CREATE POLICY "Operadores podem atualizar itens de notas" ON public.notas_fiscais_itens
  FOR UPDATE USING (
    can_edit(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.notas_fiscais nf 
      WHERE nf.id = nota_fiscal_id AND granja_belongs_to_tenant(nf.granja_id)
    )
  );

CREATE POLICY "Operadores podem excluir itens de notas" ON public.notas_fiscais_itens
  FOR DELETE USING (
    can_edit(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.notas_fiscais nf 
      WHERE nf.id = nota_fiscal_id AND granja_belongs_to_tenant(nf.granja_id)
    )
  );

-- Índice para performance
CREATE INDEX idx_notas_fiscais_itens_nota ON public.notas_fiscais_itens(nota_fiscal_id);

-- 5. Popular CFOPs comuns para operações agrícolas
INSERT INTO public.cfops (codigo, descricao, natureza_operacao, tipo, aplicacao) VALUES
-- Saídas (5xxx - Estadual, 6xxx - Interestadual)
('5101', 'Venda de produção do estabelecimento', 'Venda de Produção', 'saida', 'venda_producao'),
('5102', 'Venda de mercadoria adquirida ou recebida de terceiros', 'Venda de Mercadoria', 'saida', 'venda_mercadoria'),
('5111', 'Venda de produção para exportação', 'Venda p/ Exportação', 'saida', 'exportacao'),
('5116', 'Venda de produção originada de encomenda para entrega futura', 'Venda Futura', 'saida', 'venda_futura'),
('5117', 'Venda de mercadoria adquirida para entrega futura', 'Venda Futura', 'saida', 'venda_futura'),
('5118', 'Venda de produção entregue ao destinatário por conta e ordem', 'Venda por Conta e Ordem', 'saida', 'conta_ordem'),
('5119', 'Venda de mercadoria entregue ao destinatário por conta e ordem', 'Venda por Conta e Ordem', 'saida', 'conta_ordem'),
('5120', 'Venda de mercadoria adquirida ou recebida de terceiros entregue ao destinatário pelo vendedor remetente, em venda à ordem', 'Venda à Ordem', 'saida', 'venda_ordem'),
('5122', 'Venda de produção remetida para industrialização, por conta e ordem do adquirente, sem transitar pelo estabelecimento do adquirente', 'Venda Industrialização', 'saida', 'industrializacao'),
('5151', 'Transferência de produção do estabelecimento', 'Transferência', 'transferencia', 'transferencia'),
('5152', 'Transferência de mercadoria adquirida ou recebida de terceiros', 'Transferência', 'transferencia', 'transferencia'),
('5401', 'Venda de produção do estabelecimento quando o produto esteja sujeito ao regime de substituição tributária', 'Venda ST', 'saida', 'venda_st'),
('5403', 'Venda de mercadoria, adquirida ou recebida de terceiros, sujeita ao regime de substituição tributária, na condição de contribuinte-substituto', 'Venda ST', 'saida', 'venda_st'),
('5405', 'Venda de mercadoria, adquirida ou recebida de terceiros, sujeita ao regime de substituição tributária, na condição de contribuinte-substituído', 'Venda ST Substituído', 'saida', 'venda_st'),
('5551', 'Venda de bem do ativo imobilizado', 'Venda Ativo', 'saida', 'venda_ativo'),
('5556', 'Devolução de compra de material de uso ou consumo', 'Devolução Compra', 'devolucao', 'devolucao_compra'),
('5901', 'Remessa para industrialização por encomenda', 'Remessa Industrialização', 'remessa', 'industrializacao'),
('5902', 'Retorno de mercadoria utilizada na industrialização por encomenda', 'Retorno Industrialização', 'remessa', 'industrializacao'),
('5904', 'Remessa para venda fora do estabelecimento', 'Remessa Venda Ambulante', 'remessa', 'venda_ambulante'),
('5905', 'Remessa para depósito fechado ou armazém geral', 'Remessa Depósito', 'remessa', 'deposito'),
('5906', 'Retorno de mercadoria depositada em depósito fechado ou armazém geral', 'Retorno Depósito', 'remessa', 'deposito'),
('5910', 'Remessa em bonificação, doação ou brinde', 'Bonificação', 'saida', 'bonificacao'),
('5911', 'Remessa de amostra grátis', 'Amostra Grátis', 'remessa', 'amostra'),
('5912', 'Remessa de mercadoria ou bem para demonstração', 'Demonstração', 'remessa', 'demonstracao'),
('5913', 'Retorno de mercadoria ou bem recebido para demonstração', 'Retorno Demonstração', 'remessa', 'demonstracao'),
('5914', 'Remessa de mercadoria ou bem para exposição ou feira', 'Exposição/Feira', 'remessa', 'exposicao'),
('5915', 'Remessa de mercadoria ou bem para conserto ou reparo', 'Conserto', 'remessa', 'conserto'),
('5916', 'Retorno de mercadoria ou bem recebido para conserto ou reparo', 'Retorno Conserto', 'remessa', 'conserto'),
('5917', 'Remessa de mercadoria em consignação mercantil ou industrial', 'Consignação', 'remessa', 'consignacao'),
('5918', 'Devolução de mercadoria recebida em consignação mercantil ou industrial', 'Devolução Consignação', 'devolucao', 'consignacao'),
('5919', 'Devolução simbólica de mercadoria vendida ou utilizada em processo industrial, recebida anteriormente em consignação mercantil ou industrial', 'Devolução Simbólica Consignação', 'devolucao', 'consignacao'),
('5920', 'Remessa de vasilhame ou sacaria', 'Remessa Vasilhame', 'remessa', 'vasilhame'),
('5921', 'Devolução de vasilhame ou sacaria', 'Devolução Vasilhame', 'devolucao', 'vasilhame'),
('5922', 'Lançamento efetuado a título de simples faturamento decorrente de venda para entrega futura', 'Faturamento Antecipado', 'saida', 'faturamento_antecipado'),
('5923', 'Remessa de mercadoria por conta e ordem de terceiros, em venda à ordem ou em operações com armazém geral ou depósito fechado', 'Remessa Conta/Ordem', 'remessa', 'conta_ordem'),
('5924', 'Remessa para industrialização por conta e ordem do adquirente da mercadoria, quando esta não transitar pelo estabelecimento do adquirente', 'Remessa Industrialização C/O', 'remessa', 'industrializacao'),
('5925', 'Retorno de mercadoria recebida para industrialização por conta e ordem do adquirente, quando aquela não transitar pelo estabelecimento do adquirente', 'Retorno Industrialização C/O', 'remessa', 'industrializacao'),
('5929', 'Lançamento efetuado em decorrência de emissão de documento fiscal relativo a operação ou prestação também registrada em equipamento Emissor de Cupom Fiscal - ECF', 'Lançamento ECF', 'saida', 'ecf'),
('5949', 'Outra saída de mercadoria ou prestação de serviço não especificada', 'Outras Saídas', 'saida', 'outras'),
-- Interestaduais (6xxx)
('6101', 'Venda de produção do estabelecimento', 'Venda de Produção', 'saida', 'venda_producao'),
('6102', 'Venda de mercadoria adquirida ou recebida de terceiros', 'Venda de Mercadoria', 'saida', 'venda_mercadoria'),
('6107', 'Venda de produção do estabelecimento, destinada a não contribuinte', 'Venda Não Contribuinte', 'saida', 'venda_nao_contribuinte'),
('6108', 'Venda de mercadoria adquirida ou recebida de terceiros, destinada a não contribuinte', 'Venda Não Contribuinte', 'saida', 'venda_nao_contribuinte'),
('6111', 'Venda de produção do estabelecimento remetida anteriormente em consignação industrial', 'Venda Consignação', 'saida', 'consignacao'),
('6112', 'Venda de mercadoria adquirida ou recebida de terceiros remetida anteriormente em consignação industrial', 'Venda Consignação', 'saida', 'consignacao'),
('6113', 'Venda de produção do estabelecimento remetida anteriormente em consignação mercantil', 'Venda Consignação', 'saida', 'consignacao'),
('6114', 'Venda de mercadoria adquirida ou recebida de terceiros remetida anteriormente em consignação mercantil', 'Venda Consignação', 'saida', 'consignacao'),
('6116', 'Venda de produção do estabelecimento originada de encomenda para entrega futura', 'Venda Futura', 'saida', 'venda_futura'),
('6117', 'Venda de mercadoria adquirida ou recebida de terceiros, originada de encomenda para entrega futura', 'Venda Futura', 'saida', 'venda_futura'),
('6151', 'Transferência de produção do estabelecimento', 'Transferência', 'transferencia', 'transferencia'),
('6152', 'Transferência de mercadoria adquirida ou recebida de terceiros', 'Transferência', 'transferencia', 'transferencia'),
('6401', 'Venda de produção do estabelecimento quando o produto esteja sujeito ao regime de substituição tributária, na condição de contribuinte substituto', 'Venda ST', 'saida', 'venda_st'),
('6403', 'Venda de mercadoria adquirida ou recebida de terceiros em operação com mercadoria sujeita ao regime de substituição tributária, na condição de contribuinte substituto', 'Venda ST', 'saida', 'venda_st'),
('6905', 'Remessa para depósito fechado ou armazém geral', 'Remessa Depósito', 'remessa', 'deposito'),
('6906', 'Retorno de mercadoria depositada em depósito fechado ou armazém geral', 'Retorno Depósito', 'remessa', 'deposito'),
('6910', 'Remessa em bonificação, doação ou brinde', 'Bonificação', 'saida', 'bonificacao'),
('6911', 'Remessa de amostra grátis', 'Amostra Grátis', 'remessa', 'amostra'),
('6912', 'Remessa de mercadoria ou bem para demonstração, mostruário ou treinamento', 'Demonstração', 'remessa', 'demonstracao'),
('6913', 'Retorno de mercadoria ou bem recebido para demonstração, mostruário ou treinamento', 'Retorno Demonstração', 'remessa', 'demonstracao'),
('6914', 'Remessa de mercadoria ou bem para exposição ou feira', 'Exposição/Feira', 'remessa', 'exposicao'),
('6915', 'Remessa de mercadoria ou bem para conserto ou reparo', 'Conserto', 'remessa', 'conserto'),
('6916', 'Retorno de mercadoria ou bem recebido para conserto ou reparo', 'Retorno Conserto', 'remessa', 'conserto'),
('6917', 'Remessa de mercadoria em consignação mercantil ou industrial', 'Consignação', 'remessa', 'consignacao'),
('6918', 'Devolução de mercadoria recebida em consignação mercantil ou industrial', 'Devolução Consignação', 'devolucao', 'consignacao'),
('6920', 'Remessa de vasilhame ou sacaria', 'Remessa Vasilhame', 'remessa', 'vasilhame'),
('6921', 'Devolução de vasilhame ou sacaria', 'Devolução Vasilhame', 'devolucao', 'vasilhame'),
('6922', 'Lançamento efetuado a título de simples faturamento decorrente de venda para entrega futura', 'Faturamento Antecipado', 'saida', 'faturamento_antecipado'),
('6923', 'Remessa de mercadoria por conta e ordem de terceiros, em venda à ordem ou em operações com armazém geral ou depósito fechado', 'Remessa Conta/Ordem', 'remessa', 'conta_ordem'),
('6949', 'Outra saída de mercadoria ou prestação de serviço não especificada', 'Outras Saídas', 'saida', 'outras'),
-- Entradas (1xxx - Estadual, 2xxx - Interestadual)
('1101', 'Compra para industrialização ou produção rural', 'Compra Industrialização', 'entrada', 'compra_industrializacao'),
('1102', 'Compra para comercialização', 'Compra Comercialização', 'entrada', 'compra_comercializacao'),
('1111', 'Compra para industrialização de mercadoria recebida anteriormente em consignação industrial', 'Compra Consignação', 'entrada', 'consignacao'),
('1113', 'Compra para comercialização de mercadoria recebida anteriormente em consignação mercantil', 'Compra Consignação', 'entrada', 'consignacao'),
('1116', 'Compra para industrialização originada de encomenda para recebimento futuro', 'Compra Futura', 'entrada', 'compra_futura'),
('1117', 'Compra para comercialização originada de encomenda para recebimento futuro', 'Compra Futura', 'entrada', 'compra_futura'),
('1118', 'Compra para industrialização procedente da zona franca de Manaus, de áreas de livre comércio ou de Manaus', 'Compra ZFM', 'entrada', 'zfm'),
('1120', 'Compra para industrialização, em venda à ordem, já recebida do vendedor remetente', 'Compra Venda Ordem', 'entrada', 'venda_ordem'),
('1121', 'Compra para comercialização, em venda à ordem, já recebida do vendedor remetente', 'Compra Venda Ordem', 'entrada', 'venda_ordem'),
('1122', 'Compra para industrialização em que a mercadoria foi remetida pelo fornecedor ao industrializador sem transitar pelo estabelecimento adquirente', 'Compra Industrialização', 'entrada', 'industrializacao'),
('1124', 'Industrialização efetuada por outra empresa', 'Industrialização por Terceiro', 'entrada', 'industrializacao'),
('1125', 'Industrialização efetuada por outra empresa quando a mercadoria remetida para utilização no processo de industrialização não transitou pelo estabelecimento adquirente da mercadoria', 'Industrialização por Terceiro', 'entrada', 'industrializacao'),
('1126', 'Compra para utilização na prestação de serviço sujeita ao ICMS', 'Compra Serviço ICMS', 'entrada', 'servico'),
('1128', 'Compra para utilização na prestação de serviço sujeita ao ISSQN', 'Compra Serviço ISS', 'entrada', 'servico'),
('1151', 'Transferência para industrialização ou produção rural', 'Transferência', 'transferencia', 'transferencia'),
('1152', 'Transferência para comercialização', 'Transferência', 'transferencia', 'transferencia'),
('1201', 'Devolução de venda de produção do estabelecimento', 'Devolução Venda', 'devolucao', 'devolucao_venda'),
('1202', 'Devolução de venda de mercadoria adquirida ou recebida de terceiros', 'Devolução Venda', 'devolucao', 'devolucao_venda'),
('1251', 'Compra de energia elétrica para distribuição ou comercialização', 'Compra Energia', 'entrada', 'energia'),
('1252', 'Compra de energia elétrica por estabelecimento industrial', 'Compra Energia', 'entrada', 'energia'),
('1253', 'Compra de energia elétrica por estabelecimento comercial', 'Compra Energia', 'entrada', 'energia'),
('1254', 'Compra de energia elétrica por estabelecimento prestador de serviço de transporte', 'Compra Energia', 'entrada', 'energia'),
('1255', 'Compra de energia elétrica por estabelecimento prestador de serviço de comunicação', 'Compra Energia', 'entrada', 'energia'),
('1256', 'Compra de energia elétrica por estabelecimento de produtor rural', 'Compra Energia', 'entrada', 'energia'),
('1257', 'Compra de energia elétrica para consumo por demanda contratada', 'Compra Energia', 'entrada', 'energia'),
('1401', 'Compra para industrialização ou produção rural de mercadoria sujeita ao regime de substituição tributária', 'Compra ST', 'entrada', 'compra_st'),
('1403', 'Compra para comercialização em operação com mercadoria sujeita ao regime de substituição tributária', 'Compra ST', 'entrada', 'compra_st'),
('1407', 'Compra de mercadoria para uso ou consumo cuja mercadoria está sujeita ao regime de substituição tributária', 'Compra ST', 'entrada', 'compra_st'),
('1408', 'Transferência para industrialização ou produção rural de mercadoria sujeita ao regime de substituição tributária', 'Transferência ST', 'transferencia', 'transferencia'),
('1409', 'Transferência para comercialização em operação com mercadoria sujeita ao regime de substituição tributária', 'Transferência ST', 'transferencia', 'transferencia'),
('1411', 'Devolução de venda de mercadoria adquirida ou recebida de terceiros em operação com mercadoria sujeita ao regime de substituição tributária', 'Devolução Venda ST', 'devolucao', 'devolucao_venda'),
('1501', 'Entrada de mercadoria recebida com fim específico de exportação', 'Entrada p/ Exportação', 'entrada', 'exportacao'),
('1503', 'Entrada decorrente de devolução de produto remetido com fim específico de exportação, de produção do estabelecimento', 'Devolução Exportação', 'devolucao', 'exportacao'),
('1504', 'Entrada decorrente de devolução de mercadoria remetida com fim específico de exportação, adquirida ou recebida de terceiros', 'Devolução Exportação', 'devolucao', 'exportacao'),
('1551', 'Compra de bem para o ativo imobilizado', 'Compra Ativo', 'entrada', 'ativo'),
('1552', 'Transferência de bem do ativo imobilizado', 'Transferência Ativo', 'transferencia', 'ativo'),
('1553', 'Devolução de venda de bem do ativo imobilizado', 'Devolução Ativo', 'devolucao', 'ativo'),
('1556', 'Compra de material para uso ou consumo', 'Compra Uso/Consumo', 'entrada', 'uso_consumo'),
('1557', 'Transferência de material para uso ou consumo', 'Transferência Uso/Consumo', 'transferencia', 'uso_consumo'),
('1601', 'Recebimento, por transferência, de crédito de ICMS', 'Transferência Crédito', 'entrada', 'credito'),
('1602', 'Recebimento, por transferência, de saldo credor do ICMS, de outro estabelecimento da mesma empresa, para compensação de saldo devedor de ICMS', 'Transferência Saldo', 'entrada', 'credito'),
('1603', 'Ressarcimento de ICMS retido por substituição tributária', 'Ressarcimento ST', 'entrada', 'ressarcimento'),
('1604', 'Lançamento do crédito relativo à compra de bem para o ativo imobilizado', 'Crédito Ativo', 'entrada', 'credito'),
('1605', 'Recebimento, por transferência, de saldo devedor do ICMS de outro estabelecimento da mesma empresa', 'Transferência Débito', 'entrada', 'debito'),
('1651', 'Compra de combustível ou lubrificante para industrialização subsequente', 'Compra Combustível', 'entrada', 'combustivel'),
('1652', 'Compra de combustível ou lubrificante para comercialização', 'Compra Combustível', 'entrada', 'combustivel'),
('1653', 'Compra de combustível ou lubrificante por consumidor ou usuário final', 'Compra Combustível', 'entrada', 'combustivel'),
('1658', 'Transferência de combustível ou lubrificante para industrialização', 'Transferência Combustível', 'transferencia', 'combustivel'),
('1659', 'Transferência de combustível ou lubrificante para comercialização', 'Transferência Combustível', 'transferencia', 'combustivel'),
('1660', 'Devolução de venda de combustível ou lubrificante destinados à industrialização subsequente', 'Devolução Combustível', 'devolucao', 'combustivel'),
('1661', 'Devolução de venda de combustível ou lubrificante destinados à comercialização', 'Devolução Combustível', 'devolucao', 'combustivel'),
('1662', 'Devolução de venda de combustível ou lubrificante destinados a consumidor ou usuário final', 'Devolução Combustível', 'devolucao', 'combustivel'),
('1901', 'Entrada para industrialização por encomenda', 'Entrada Industrialização', 'entrada', 'industrializacao'),
('1902', 'Retorno de mercadoria remetida para industrialização por encomenda', 'Retorno Industrialização', 'entrada', 'industrializacao'),
('1903', 'Entrada de mercadoria remetida para industrialização e não aplicada no referido processo', 'Entrada Industrialização', 'entrada', 'industrializacao'),
('1904', 'Retorno de remessa para venda fora do estabelecimento', 'Retorno Venda Ambulante', 'entrada', 'venda_ambulante'),
('1905', 'Entrada de mercadoria recebida para depósito em depósito fechado ou armazém geral', 'Entrada Depósito', 'entrada', 'deposito'),
('1906', 'Retorno de mercadoria remetida para depósito fechado ou armazém geral', 'Retorno Depósito', 'entrada', 'deposito'),
('1907', 'Retorno simbólico de mercadoria remetida para depósito fechado ou armazém geral', 'Retorno Depósito Simbólico', 'entrada', 'deposito'),
('1908', 'Entrada de bem por conta de contrato de comodato', 'Comodato', 'entrada', 'comodato'),
('1909', 'Retorno de bem remetido por conta de contrato de comodato', 'Retorno Comodato', 'entrada', 'comodato'),
('1910', 'Entrada de bonificação, doação ou brinde', 'Bonificação', 'entrada', 'bonificacao'),
('1911', 'Entrada de amostra grátis', 'Amostra Grátis', 'entrada', 'amostra'),
('1912', 'Entrada de mercadoria ou bem recebido para demonstração', 'Demonstração', 'entrada', 'demonstracao'),
('1913', 'Retorno de mercadoria ou bem remetido para demonstração', 'Retorno Demonstração', 'entrada', 'demonstracao'),
('1914', 'Retorno de mercadoria ou bem remetido para exposição ou feira', 'Retorno Exposição', 'entrada', 'exposicao'),
('1915', 'Entrada de mercadoria ou bem recebido para conserto ou reparo', 'Conserto', 'entrada', 'conserto'),
('1916', 'Retorno de mercadoria ou bem remetido para conserto ou reparo', 'Retorno Conserto', 'entrada', 'conserto'),
('1917', 'Entrada de mercadoria recebida em consignação mercantil ou industrial', 'Consignação', 'entrada', 'consignacao'),
('1918', 'Devolução de mercadoria remetida em consignação mercantil ou industrial', 'Devolução Consignação', 'devolucao', 'consignacao'),
('1919', 'Devolução simbólica de mercadoria vendida ou utilizada em processo industrial, remetida anteriormente em consignação mercantil ou industrial', 'Devolução Simbólica Consignação', 'devolucao', 'consignacao'),
('1920', 'Entrada de vasilhame ou sacaria', 'Entrada Vasilhame', 'entrada', 'vasilhame'),
('1921', 'Retorno de vasilhame ou sacaria', 'Retorno Vasilhame', 'entrada', 'vasilhame'),
('1922', 'Lançamento efetuado a título de simples faturamento decorrente de compra para recebimento futuro', 'Faturamento Antecipado', 'entrada', 'faturamento_antecipado'),
('1923', 'Entrada de mercadoria recebida do vendedor remetente, em venda à ordem', 'Venda à Ordem', 'entrada', 'venda_ordem'),
('1924', 'Entrada para industrialização por conta e ordem do adquirente da mercadoria, quando esta não transitar pelo estabelecimento do adquirente', 'Industrialização C/O', 'entrada', 'industrializacao'),
('1925', 'Retorno de mercadoria remetida para industrialização por conta e ordem do adquirente da mercadoria, quando esta não transitar pelo estabelecimento do adquirente', 'Retorno Industrialização C/O', 'entrada', 'industrializacao'),
('1926', 'Lançamento efetuado a título de reclassificação de mercadoria decorrente de formação de kit ou de sua desagregação', 'Reclassificação', 'entrada', 'reclassificacao'),
('1931', 'Lançamento efetuado pelo tomador do serviço de transporte quando a responsabilidade de retenção do imposto for atribuída ao remetente ou alienante da mercadoria, pelo serviço de transporte realizado por transportador autônomo ou por transportador não inscrito na unidade da Federação onde iniciado o serviço', 'Transporte', 'entrada', 'transporte'),
('1932', 'Aquisição de serviço de transporte iniciado em unidade da Federação diversa daquela onde inscrito o prestador', 'Transporte', 'entrada', 'transporte'),
('1933', 'Aquisição de serviço tributado pelo ISSQN', 'Serviço ISS', 'entrada', 'servico'),
('1934', 'Entrada simbólica de mercadoria recebida para depósito fechado ou armazém geral', 'Entrada Depósito Simbólica', 'entrada', 'deposito'),
('1949', 'Outra entrada de mercadoria ou prestação de serviço não especificada', 'Outras Entradas', 'entrada', 'outras'),
-- Interestaduais Entradas (2xxx)
('2101', 'Compra para industrialização ou produção rural', 'Compra Industrialização', 'entrada', 'compra_industrializacao'),
('2102', 'Compra para comercialização', 'Compra Comercialização', 'entrada', 'compra_comercializacao'),
('2111', 'Compra para industrialização de mercadoria recebida anteriormente em consignação industrial', 'Compra Consignação', 'entrada', 'consignacao'),
('2113', 'Compra para comercialização, de mercadoria recebida anteriormente em consignação mercantil', 'Compra Consignação', 'entrada', 'consignacao'),
('2116', 'Compra para industrialização originada de encomenda para recebimento futuro', 'Compra Futura', 'entrada', 'compra_futura'),
('2117', 'Compra para comercialização originada de encomenda para recebimento futuro', 'Compra Futura', 'entrada', 'compra_futura'),
('2151', 'Transferência para industrialização ou produção rural', 'Transferência', 'transferencia', 'transferencia'),
('2152', 'Transferência para comercialização', 'Transferência', 'transferencia', 'transferencia'),
('2201', 'Devolução de venda de produção do estabelecimento', 'Devolução Venda', 'devolucao', 'devolucao_venda'),
('2202', 'Devolução de venda de mercadoria adquirida ou recebida de terceiros', 'Devolução Venda', 'devolucao', 'devolucao_venda'),
('2401', 'Compra para industrialização ou produção rural de mercadoria sujeita ao regime de substituição tributária', 'Compra ST', 'entrada', 'compra_st'),
('2403', 'Compra para comercialização em operação com mercadoria sujeita ao regime de substituição tributária', 'Compra ST', 'entrada', 'compra_st'),
('2551', 'Compra de bem para o ativo imobilizado', 'Compra Ativo', 'entrada', 'ativo'),
('2556', 'Compra de material para uso ou consumo', 'Compra Uso/Consumo', 'entrada', 'uso_consumo'),
('2905', 'Entrada de mercadoria recebida para depósito em depósito fechado ou armazém geral', 'Entrada Depósito', 'entrada', 'deposito'),
('2906', 'Retorno de mercadoria remetida para depósito fechado ou armazém geral', 'Retorno Depósito', 'entrada', 'deposito'),
('2910', 'Entrada de bonificação, doação ou brinde', 'Bonificação', 'entrada', 'bonificacao'),
('2911', 'Entrada de amostra grátis', 'Amostra Grátis', 'entrada', 'amostra'),
('2912', 'Entrada de mercadoria ou bem recebido para demonstração', 'Demonstração', 'entrada', 'demonstracao'),
('2913', 'Retorno de mercadoria ou bem remetido para demonstração', 'Retorno Demonstração', 'entrada', 'demonstracao'),
('2914', 'Retorno de mercadoria ou bem remetido para exposição ou feira', 'Retorno Exposição', 'entrada', 'exposicao'),
('2915', 'Entrada de mercadoria ou bem recebido para conserto ou reparo', 'Conserto', 'entrada', 'conserto'),
('2916', 'Retorno de mercadoria ou bem remetido para conserto ou reparo', 'Retorno Conserto', 'entrada', 'conserto'),
('2917', 'Entrada de mercadoria recebida em consignação mercantil ou industrial', 'Consignação', 'entrada', 'consignacao'),
('2918', 'Devolução de mercadoria remetida em consignação mercantil ou industrial', 'Devolução Consignação', 'devolucao', 'consignacao'),
('2920', 'Entrada de vasilhame ou sacaria', 'Entrada Vasilhame', 'entrada', 'vasilhame'),
('2921', 'Retorno de vasilhame ou sacaria', 'Retorno Vasilhame', 'entrada', 'vasilhame'),
('2949', 'Outra entrada de mercadoria ou prestação de serviço não especificada', 'Outras Entradas', 'entrada', 'outras');
