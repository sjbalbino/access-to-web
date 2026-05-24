
-- =====================================================================
-- 1. CATÁLOGO GLOBAL DE BANCOS (Febraban)
-- =====================================================================
CREATE TABLE public.bancos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bancos_nome ON public.bancos (nome);

ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bancos_select_all" ON public.bancos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "bancos_admin_insert" ON public.bancos
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "bancos_admin_update" ON public.bancos
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "bancos_admin_delete" ON public.bancos
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_bancos_updated_at
  BEFORE UPDATE ON public.bancos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Febraban (principais)
INSERT INTO public.bancos (codigo, nome) VALUES
  ('001','Banco do Brasil S.A.'),
  ('003','Banco da Amazônia S.A.'),
  ('004','Banco do Nordeste do Brasil S.A.'),
  ('010','Credicoamo Crédito Rural Cooperativa'),
  ('011','Credit Suisse Hedging-Griffo Corretora'),
  ('012','Banco Inbursa S.A.'),
  ('021','Banestes S.A. Banco do Estado do Espírito Santo'),
  ('025','Banco Alfa S.A.'),
  ('029','Banco Itaú Consignado S.A.'),
  ('033','Banco Santander (Brasil) S.A.'),
  ('036','Banco Bradesco BBI S.A.'),
  ('037','Banco do Estado do Pará S.A. (Banpará)'),
  ('040','Banco Cargill S.A.'),
  ('041','Banco do Estado do Rio Grande do Sul S.A. (Banrisul)'),
  ('047','Banco do Estado de Sergipe S.A. (Banese)'),
  ('060','Confidence Corretora de Câmbio S.A.'),
  ('062','Hipercard Banco Múltiplo S.A.'),
  ('063','Banco Bradescard S.A.'),
  ('064','Goldman Sachs do Brasil Banco Múltiplo S.A.'),
  ('065','Banco AndBank (Brasil) S.A.'),
  ('066','Banco Morgan Stanley S.A.'),
  ('069','Banco Crefisa S.A.'),
  ('070','BRB - Banco de Brasília S.A.'),
  ('074','Banco J. Safra S.A.'),
  ('075','Banco ABN Amro S.A.'),
  ('076','Banco KDB do Brasil S.A.'),
  ('077','Banco Inter S.A.'),
  ('078','Haitong Banco de Investimento do Brasil S.A.'),
  ('079','Banco Original do Agronegócio S.A.'),
  ('081','BBN Banco Brasileiro de Negócios S.A.'),
  ('082','Banco Topázio S.A.'),
  ('083','Banco da China Brasil S.A.'),
  ('084','Sisprime do Brasil - Coop. de Crédito'),
  ('085','Cooperativa Central de Crédito - Ailos'),
  ('089','Cooperativa de Crédito Rural da Região da Mogiana'),
  ('091','Unicred Central RS - Central de Coop. de Crédito do RS'),
  ('093','Pólocred SCMEPP Ltda.'),
  ('094','Banco Finaxis S.A.'),
  ('095','Banco Confidence de Câmbio S.A.'),
  ('096','Banco B3 S.A.'),
  ('097','Credisis - Central de Cooperativas de Crédito Ltda.'),
  ('099','UNIPRIME Central - Central Interestadual de Cooperativas de Crédito Ltda.'),
  ('100','Planner Corretora de Valores S.A.'),
  ('101','Renascença Distribuidora de Títulos e Valores Mobiliários Ltda.'),
  ('102','XP Investimentos Corretora de Câmbio, Títulos e Valores Mobiliários S.A.'),
  ('104','Caixa Econômica Federal'),
  ('105','Lecca Crédito, Financiamento e Investimento S.A.'),
  ('107','Banco BOCOM BBM S.A.'),
  ('108','PortoCred S.A. Crédito, Financiamento e Investimento'),
  ('111','Oliveira Trust Distribuidora de Títulos e Valores Mobiliários S.A.'),
  ('113','Magliano S.A. Corretora de Cambio e Valores Mobiliários'),
  ('114','Central Cooperativa de Crédito no Estado do Espírito Santo - CECOOP'),
  ('117','Advanced Corretora de Câmbio Ltda.'),
  ('119','Banco Western Union do Brasil S.A.'),
  ('120','Banco Rodobens S.A.'),
  ('121','Banco Agibank S.A.'),
  ('122','Banco Bradesco BERJ S.A.'),
  ('124','Banco Woori Bank do Brasil S.A.'),
  ('125','Plural S.A. Banco Múltiplo'),
  ('126','BR Partners Banco de Investimento S.A.'),
  ('127','Codepe Corretora de Valores e Câmbio S.A.'),
  ('128','MS Bank S.A. Banco de Câmbio'),
  ('129','UBS Brasil Banco de Investimento S.A.'),
  ('130','Caruana S.A. - Sociedade de Crédito, Financiamento e Investimento'),
  ('131','Tullett Prebon Brasil Corretora de Valores e Câmbio Ltda.'),
  ('132','ICBC do Brasil Banco Múltiplo S.A.'),
  ('133','Confederação Nacional das Cooperativas Centrais Unicreds (Cresol Confederação)'),
  ('134','BGC Liquidez Distribuidora de Títulos e Valores Mobiliários Ltda.'),
  ('136','Unicred Cooperativa'),
  ('137','Multimoney Corretora de Câmbio Ltda.'),
  ('138','Get Money Corretora de Câmbio S.A.'),
  ('139','Intesa Sanpaolo Brasil S.A. Banco Múltiplo'),
  ('140','Easynvest - Título Corretora de Valores S.A.'),
  ('142','Broker Brasil Corretora de Câmbio Ltda.'),
  ('143','Treviso Corretora de Câmbio S.A.'),
  ('144','Bexs Banco de Câmbio S.A.'),
  ('145','Levycam - Corretora de Câmbio e Valores Ltda.'),
  ('146','Guitta Corretora de Câmbio Ltda.'),
  ('149','Facta Financeira S.A. - Crédito Financiamento e Investimento'),
  ('157','ICAP do Brasil Corretora de Títulos e Valores Mobiliários Ltda.'),
  ('159','Casa do Crédito S.A. Sociedade de Crédito ao Microempreendedor'),
  ('163','Commerzbank Brasil S.A. - Banco Múltiplo'),
  ('169','Banco Olé Bonsucesso Consignado S.A.'),
  ('172','Albatross Corretora de Câmbio e Valores S.A.'),
  ('173','BRL Trust Distribuidora de Títulos e Valores Mobiliários S.A.'),
  ('174','Pernambucanas Financiadora S.A.'),
  ('177','Guide Investimentos S.A. Corretora de Valores'),
  ('180','CM Capital Markets Corretora de Câmbio, Títulos e Valores Mobiliários Ltda.'),
  ('183','Socred S.A. - Sociedade de Crédito ao Microempreendedor'),
  ('184','Banco Itaú BBA S.A.'),
  ('188','Ativa Investimentos S.A. Corretora de Títulos Câmbio e Valores'),
  ('189','HS Financeira S.A. Crédito, Financiamento e Investimentos'),
  ('190','Servicoop - Cooperativa de Crédito dos Servidores Públicos Estaduais do RS'),
  ('191','Nova Futura Corretora de Títulos e Valores Mobiliários Ltda.'),
  ('194','Parmetal Distribuidora de Títulos e Valores Mobiliários Ltda.'),
  ('196','Fair Corretora de Câmbio S.A.'),
  ('197','Stone Pagamentos S.A.'),
  ('208','Banco BTG Pactual S.A.'),
  ('212','Banco Original S.A.'),
  ('213','Banco Arbi S.A.'),
  ('217','Banco John Deere S.A.'),
  ('218','Banco BS2 S.A.'),
  ('222','Banco Credit Agricole Brasil S.A.'),
  ('224','Banco Fibra S.A.'),
  ('233','Banco Cifra S.A.'),
  ('237','Banco Bradesco S.A.'),
  ('241','Banco Clássico S.A.'),
  ('243','Banco Máxima S.A.'),
  ('246','Banco ABC Brasil S.A.'),
  ('249','Banco Investcred Unibanco S.A.'),
  ('250','BCV - Banco de Crédito e Varejo S.A.'),
  ('253','Bexs Corretora de Câmbio S.A.'),
  ('254','Parana Banco S.A.'),
  ('260','Nu Pagamentos S.A. (Nubank)'),
  ('265','Banco Fator S.A.'),
  ('266','Banco Cédula S.A.'),
  ('268','Barigui Companhia Hipotecária'),
  ('269','HSBC Brasil S.A. Banco de Investimento'),
  ('270','Sagitur Corretora de Câmbio Ltda.'),
  ('271','IB Corretora de Câmbio, Títulos e Valores Mobiliários Ltda.'),
  ('272','AGK Corretora de Câmbio S.A.'),
  ('273','Cooperativa de Crédito Rural de São Miguel do Oeste - Sulcredi/São Miguel'),
  ('274','Money Plus Sociedade de Crédito ao Microempreendedor e à Empresa de Pequeno Porte Ltda.'),
  ('276','Senff S.A. - Crédito, Financiamento e Investimento'),
  ('278','Genial Investimentos Corretora de Valores Mobiliários S.A.'),
  ('279','Cooperativa de Crédito Rural de Primavera do Leste'),
  ('280','Avista S.A. Crédito, Financiamento e Investimento'),
  ('281','Cooperativa de Crédito Rural Coopavel'),
  ('283','RB Capital Investimentos Distribuidora de Títulos e Valores Mobiliários Ltda.'),
  ('285','Frente Corretora de Câmbio Ltda.'),
  ('286','Cooperativa de Crédito Rural de Ouro - Sulcredi/Ouro'),
  ('288','Carol Distribuidora de Títulos e Valor Mobiliários Ltda.'),
  ('289','Decyseo Corretora de Câmbio Ltda.'),
  ('290','PagSeguro Internet S.A.'),
  ('292','BS2 Distribuidora de Títulos e Valores Mobiliários S.A.'),
  ('293','Lastro RDV Distribuidora de Títulos e Valores Mobiliários Ltda.'),
  ('296','Vision S.A. Corretora de Câmbio'),
  ('298','Vips Corretora de Câmbio Ltda.'),
  ('299','Sorocred Crédito, Financiamento e Investimento S.A.'),
  ('300','Banco de la Nacion Argentina'),
  ('301','BPP Instituição de Pagamento S.A.'),
  ('318','Banco BMG S.A.'),
  ('320','China Construction Bank (Brasil) Banco Múltiplo S.A.'),
  ('323','Mercado Pago - Conta do Mercado Livre'),
  ('325','Órama Distribuidora de Títulos e Valores Mobiliários S.A.'),
  ('329','QI Sociedade de Crédito Direto S.A.'),
  ('330','Banco Bari de Investimentos e Financiamentos S.A.'),
  ('335','Banco Digio S.A.'),
  ('336','Banco C6 S.A.'),
  ('340','Super Pagamentos e Administração de Meios Eletrônicos S.A.'),
  ('341','Itaú Unibanco S.A.'),
  ('366','Banco Société Générale Brasil S.A.'),
  ('370','Banco Mizuho do Brasil S.A.'),
  ('376','Banco J. P. Morgan S.A.'),
  ('380','PicPay Servicos S.A.'),
  ('389','Banco Mercantil do Brasil S.A.'),
  ('394','Banco Bradesco Financiamentos S.A.'),
  ('399','Kirton Bank S.A. - Banco Múltiplo'),
  ('412','Banco Capital S.A.'),
  ('422','Banco Safra S.A.'),
  ('456','Banco MUFG Brasil S.A.'),
  ('464','Banco Sumitomo Mitsui Brasileiro S.A.'),
  ('473','Banco Caixa Geral - Brasil S.A.'),
  ('477','Citibank N.A.'),
  ('479','Banco ItauBank S.A.'),
  ('487','Deutsche Bank S.A. - Banco Alemão'),
  ('488','JPMorgan Chase Bank, National Association'),
  ('492','ING Bank N.V.'),
  ('495','Banco de La Provincia de Buenos Aires'),
  ('505','Banco Credit Suisse (Brasil) S.A.'),
  ('545','Senso Corretora de Câmbio e Valores Mobiliários S.A.'),
  ('600','Banco Luso Brasileiro S.A.'),
  ('604','Banco Industrial do Brasil S.A.'),
  ('610','Banco VR S.A.'),
  ('611','Banco Paulista S.A.'),
  ('612','Banco Guanabara S.A.'),
  ('613','Omni Banco S.A.'),
  ('623','Banco Pan S.A.'),
  ('626','Banco C6 Consignado S.A.'),
  ('630','Banco Smartbank S.A.'),
  ('633','Banco Rendimento S.A.'),
  ('634','Banco Triângulo S.A.'),
  ('637','Banco Sofisa S.A.'),
  ('643','Banco Pine S.A.'),
  ('652','Itaú Unibanco Holding S.A.'),
  ('653','Banco Indusval S.A.'),
  ('654','Banco A. J. Renner S.A.'),
  ('655','Banco Votorantim S.A.'),
  ('707','Banco Daycoval S.A.'),
  ('712','Banco Ourinvest S.A.'),
  ('739','Banco Cetelem S.A.'),
  ('741','Banco Ribeirão Preto S.A.'),
  ('743','Banco Semear S.A.'),
  ('745','Banco Citibank S.A.'),
  ('746','Banco Modal S.A.'),
  ('747','Banco Rabobank International Brasil S.A.'),
  ('748','Banco Cooperativo Sicredi S.A.'),
  ('751','Scotiabank Brasil S.A. Banco Múltiplo'),
  ('752','Banco BNP Paribas Brasil S.A.'),
  ('753','Novo Banco Continental S.A. - Banco Múltiplo'),
  ('754','Banco Sistema S.A.'),
  ('755','Bank of America Merrill Lynch Banco Múltiplo S.A.'),
  ('756','Banco Cooperativo do Brasil S.A. - Bancoob (Sicoob)'),
  ('757','Banco KEB HANA do Brasil S.A.');

-- =====================================================================
-- 2. CONTAS BANCÁRIAS (POR TENANT, VINCULADAS A SÓCIO/GRANJA)
-- =====================================================================
CREATE TABLE public.contas_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  codigo_legado text,
  nome text NOT NULL,
  banco_id uuid REFERENCES public.bancos(id) ON DELETE SET NULL,
  agencia text,
  agencia_dv text,
  conta text,
  conta_dv text,
  tipo text NOT NULL DEFAULT 'corrente',
  socio_produtor_id uuid REFERENCES public.produtores(id) ON DELETE SET NULL,
  granja_id uuid REFERENCES public.granjas(id) ON DELETE SET NULL,
  titular text,
  cpf_cnpj_titular text,
  pix_chave text,
  pix_tipo text,
  saldo_inicial numeric(15,2) NOT NULL DEFAULT 0,
  data_saldo_inicial date,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contas_bancarias_tipo_check CHECK (tipo IN ('corrente','poupanca','investimento','caixa','outro')),
  CONSTRAINT contas_bancarias_pix_tipo_check CHECK (pix_tipo IS NULL OR pix_tipo IN ('cpf','cnpj','email','telefone','aleatoria'))
);

-- Índice único FULL (sem WHERE) para funcionar com upsert (mesmo padrão de contas_pagar)
CREATE UNIQUE INDEX contas_bancarias_tenant_codigo_legado_uq
  ON public.contas_bancarias (tenant_id, codigo_legado);

CREATE INDEX idx_cb_tenant ON public.contas_bancarias (tenant_id);
CREATE INDEX idx_cb_socio ON public.contas_bancarias (socio_produtor_id);
CREATE INDEX idx_cb_granja ON public.contas_bancarias (granja_id);
CREATE INDEX idx_cb_banco ON public.contas_bancarias (banco_id);

-- Trigger para tenant_id automático
CREATE OR REPLACE FUNCTION public.set_contas_bancarias_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := get_user_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cb_set_tenant
  BEFORE INSERT ON public.contas_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.set_contas_bancarias_tenant();

CREATE TRIGGER trg_cb_updated_at
  BEFORE UPDATE ON public.contas_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cb_select" ON public.contas_bancarias
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id() OR is_super_admin(auth.uid()));

CREATE POLICY "cb_insert" ON public.contas_bancarias
  FOR INSERT TO authenticated
  WITH CHECK (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR tenant_id IS NULL OR is_super_admin(auth.uid())));

CREATE POLICY "cb_update" ON public.contas_bancarias
  FOR UPDATE TO authenticated
  USING (can_edit(auth.uid()) AND (tenant_id = get_user_tenant_id() OR is_super_admin(auth.uid())));

CREATE POLICY "cb_delete" ON public.contas_bancarias
  FOR DELETE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
         AND (tenant_id = get_user_tenant_id() OR is_super_admin(auth.uid())));

-- =====================================================================
-- 3. FK NAS BAIXAS DE CP E CR
-- =====================================================================
ALTER TABLE public.contas_pagar_baixas
  ADD COLUMN conta_bancaria_id uuid REFERENCES public.contas_bancarias(id) ON DELETE SET NULL;

CREATE INDEX idx_cpb_conta_bancaria ON public.contas_pagar_baixas (conta_bancaria_id);

ALTER TABLE public.contas_receber_baixas
  ADD COLUMN conta_bancaria_id uuid REFERENCES public.contas_bancarias(id) ON DELETE SET NULL;

CREATE INDEX idx_crb_conta_bancaria ON public.contas_receber_baixas (conta_bancaria_id);
