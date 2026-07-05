
-- 1) Drop the standalone "super_admin_select_all" policies (25 tables).
-- Each of these tables already has a companion tenant-scoped policy that uses
-- granja_belongs_to_tenant(...) or tenant_id checks, which properly restrict
-- super admin once a tenant is selected.
DROP POLICY IF EXISTS super_admin_select_all ON public.colheitas;
DROP POLICY IF EXISTS super_admin_select_all ON public.compras_cereais;
DROP POLICY IF EXISTS super_admin_select_all ON public.compras_cereais_notas_referenciadas;
DROP POLICY IF EXISTS super_admin_select_all ON public.configuracoes_balanca;
DROP POLICY IF EXISTS super_admin_select_all ON public.contas_pagar;
DROP POLICY IF EXISTS super_admin_select_all ON public.contas_pagar_baixas;
DROP POLICY IF EXISTS super_admin_select_all ON public.contas_receber;
DROP POLICY IF EXISTS super_admin_select_all ON public.contas_receber_baixas;
DROP POLICY IF EXISTS super_admin_select_all ON public.devolucoes_deposito;
DROP POLICY IF EXISTS super_admin_select_all ON public.emitentes_nfe;
DROP POLICY IF EXISTS super_admin_select_all ON public.emitentes_nfe_credentials;
DROP POLICY IF EXISTS super_admin_select_all ON public.entradas_nfe;
DROP POLICY IF EXISTS super_admin_select_all ON public.entradas_nfe_itens;
DROP POLICY IF EXISTS super_admin_select_all ON public.estoque_produtos;
DROP POLICY IF EXISTS super_admin_select_all ON public.extratos_bancarios;
DROP POLICY IF EXISTS super_admin_select_all ON public.granjas;
DROP POLICY IF EXISTS super_admin_select_all ON public.inscricoes_produtor;
DROP POLICY IF EXISTS super_admin_select_all ON public.lancamentos_financeiros;
DROP POLICY IF EXISTS super_admin_select_all ON public.notas_deposito_emitidas;
DROP POLICY IF EXISTS super_admin_select_all ON public.notas_fiscais;
DROP POLICY IF EXISTS super_admin_select_all ON public.notas_fiscais_duplicatas;
DROP POLICY IF EXISTS super_admin_select_all ON public.notas_fiscais_itens;
DROP POLICY IF EXISTS super_admin_select_all ON public.notas_fiscais_referenciadas;
DROP POLICY IF EXISTS super_admin_select_all ON public.produtores;
DROP POLICY IF EXISTS super_admin_select_all ON public.transferencias_deposito;

-- 2) Recreate combined SELECT policies to restrict super admin to the selected tenant.
--    Pattern: (tenant_id = get_user_tenant_id())
--          OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)
--    Meaning: super admin without a selected company still sees everything
--    (needed for the "Selecionar Empresa" screen); once selected, they are scoped.

DROP POLICY IF EXISTS tenant_select_analises_solo ON public.analises_solo;
CREATE POLICY tenant_select_analises_solo ON public.analises_solo FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_aplicacoes ON public.aplicacoes;
CREATE POLICY tenant_select_aplicacoes ON public.aplicacoes FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_chuvas ON public.chuvas;
CREATE POLICY tenant_select_chuvas ON public.chuvas FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS "Usuários veem clientes_fornecedores do seu tenant" ON public.clientes_fornecedores;
CREATE POLICY "Usuários veem clientes_fornecedores do seu tenant" ON public.clientes_fornecedores FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS cb_select ON public.contas_bancarias;
CREATE POLICY cb_select ON public.contas_bancarias FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_contratos_venda ON public.contratos_venda;
CREATE POLICY tenant_select_contratos_venda ON public.contratos_venda FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_controle_lavouras ON public.controle_lavouras;
CREATE POLICY tenant_select_controle_lavouras ON public.controle_lavouras FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_culturas ON public.culturas;
CREATE POLICY tenant_select_culturas ON public.culturas FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_dfe_cache ON public.dfe_nfes_cache;
CREATE POLICY tenant_select_dfe_cache ON public.dfe_nfes_cache FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_dre_contas ON public.dre_contas;
CREATE POLICY tenant_select_dre_contas ON public.dre_contas FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_floracoes ON public.floracoes;
CREATE POLICY tenant_select_floracoes ON public.floracoes FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_grupos_produtos ON public.grupos_produtos;
CREATE POLICY tenant_select_grupos_produtos ON public.grupos_produtos FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_insetos ON public.insetos;
CREATE POLICY tenant_select_insetos ON public.insetos FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS rateio_select ON public.lancamento_rateio_socios;
CREATE POLICY rateio_select ON public.lancamento_rateio_socios FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_lavouras ON public.lavouras;
CREATE POLICY tenant_select_lavouras ON public.lavouras FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_locais_entrega ON public.locais_entrega;
CREATE POLICY tenant_select_locais_entrega ON public.locais_entrega FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_pivos ON public.pivos;
CREATE POLICY tenant_select_pivos ON public.pivos FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_placas ON public.placas;
CREATE POLICY tenant_select_placas ON public.placas FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_plano_contas_gerencial ON public.plano_contas_gerencial;
CREATE POLICY tenant_select_plano_contas_gerencial ON public.plano_contas_gerencial FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_plantas_invasoras ON public.plantas_invasoras;
CREATE POLICY tenant_select_plantas_invasoras ON public.plantas_invasoras FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_plantios ON public.plantios;
CREATE POLICY tenant_select_plantios ON public.plantios FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_produtos ON public.produtos;
CREATE POLICY tenant_select_produtos ON public.produtos FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

-- rateio_recalculo_logs uses granja_belongs_to_tenant which already handles super admin
-- correctly (returns true only when get_user_tenant_id() IS NULL). Just drop the extra OR.
DROP POLICY IF EXISTS tenant_select_rateio_recalculo_logs ON public.rateio_recalculo_logs;
CREATE POLICY tenant_select_rateio_recalculo_logs ON public.rateio_recalculo_logs FOR SELECT
  USING (granja_belongs_to_tenant(granja_id));

DROP POLICY IF EXISTS tenant_select_remessas_venda ON public.remessas_venda;
CREATE POLICY tenant_select_remessas_venda ON public.remessas_venda FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_safras ON public.safras;
CREATE POLICY tenant_select_safras ON public.safras FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_silos ON public.silos;
CREATE POLICY tenant_select_silos ON public.silos FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_sub_centros_custo ON public.sub_centros_custo;
CREATE POLICY tenant_select_sub_centros_custo ON public.sub_centros_custo FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_tabela_umidades ON public.tabela_umidades;
CREATE POLICY tenant_select_tabela_umidades ON public.tabela_umidades FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_transportadoras ON public.transportadoras;
CREATE POLICY tenant_select_transportadoras ON public.transportadoras FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));

DROP POLICY IF EXISTS tenant_select_unidades_medida ON public.unidades_medida;
CREATE POLICY tenant_select_unidades_medida ON public.unidades_medida FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL));
