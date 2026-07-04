CREATE OR REPLACE FUNCTION public.cleanup_tenant_data(_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_granja_ids uuid[] := ARRAY[]::uuid[];
  v_conta_bancaria_ids uuid[] := ARRAY[]::uuid[];
  v_controle_lavoura_ids uuid[] := ARRAY[]::uuid[];
  v_compra_ids uuid[] := ARRAY[]::uuid[];
  v_entrada_nfe_ids uuid[] := ARRAY[]::uuid[];
  v_nota_fiscal_ids uuid[] := ARRAY[]::uuid[];
  v_inscricao_ids uuid[] := ARRAY[]::uuid[];
  v_emitente_ids uuid[] := ARRAY[]::uuid[];
  v_contas_pagar_ids uuid[] := ARRAY[]::uuid[];
  v_contas_receber_ids uuid[] := ARRAY[]::uuid[];
  v_lancamento_ids uuid[] := ARRAY[]::uuid[];
  v_extrato_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas super administradores podem limpar dados de tenants';
  END IF;

  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id obrigatório';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_granja_ids
  FROM public.granjas
  WHERE tenant_id = _tenant_id;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_conta_bancaria_ids
  FROM public.contas_bancarias
  WHERE tenant_id = _tenant_id
     OR granja_id = ANY(v_granja_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_controle_lavoura_ids
  FROM public.controle_lavouras
  WHERE tenant_id = _tenant_id
     OR granja_id = ANY(v_granja_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_compra_ids
  FROM public.compras_cereais
  WHERE granja_id = ANY(v_granja_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_entrada_nfe_ids
  FROM public.entradas_nfe
  WHERE granja_id = ANY(v_granja_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_nota_fiscal_ids
  FROM public.notas_fiscais
  WHERE tenant_id = _tenant_id
     OR granja_id = ANY(v_granja_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_inscricao_ids
  FROM public.inscricoes_produtor
  WHERE granja_id = ANY(v_granja_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_emitente_ids
  FROM public.emitentes_nfe
  WHERE granja_id = ANY(v_granja_ids)
     OR inscricao_produtor_id = ANY(v_inscricao_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_contas_pagar_ids
  FROM public.contas_pagar
  WHERE tenant_id = _tenant_id
     OR granja_id = ANY(v_granja_ids)
     OR compra_cereais_id = ANY(v_compra_ids)
     OR entrada_nfe_id = ANY(v_entrada_nfe_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_contas_receber_ids
  FROM public.contas_receber
  WHERE tenant_id = _tenant_id
     OR granja_id = ANY(v_granja_ids)
     OR nota_fiscal_id = ANY(v_nota_fiscal_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_lancamento_ids
  FROM public.lancamentos_financeiros
  WHERE granja_id = ANY(v_granja_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_extrato_ids
  FROM public.extratos_bancarios
  WHERE conta_bancaria_id = ANY(v_conta_bancaria_ids);

  -- Rateios: limpar por tenant e também por vínculos antigos sem tenant_id preenchido.
  DELETE FROM public.lancamento_rateio_socios
  WHERE tenant_id = _tenant_id
     OR (origem_tipo = 'lancamento' AND origem_id = ANY(v_lancamento_ids))
     OR (origem_tipo = 'cp' AND origem_id = ANY(v_contas_pagar_ids))
     OR (origem_tipo = 'cr' AND origem_id = ANY(v_contas_receber_ids))
     OR (origem_tipo = 'cp_baixa' AND origem_id IN (SELECT id FROM public.contas_pagar_baixas WHERE conta_id = ANY(v_contas_pagar_ids)))
     OR (origem_tipo = 'cr_baixa' AND origem_id IN (SELECT id FROM public.contas_receber_baixas WHERE conta_id = ANY(v_contas_receber_ids)));

  -- Baixas e vínculos financeiros dependentes.
  DELETE FROM public.contas_pagar_baixas
  WHERE conta_id = ANY(v_contas_pagar_ids)
     OR conta_bancaria_id = ANY(v_conta_bancaria_ids)
     OR lancamento_financeiro_id = ANY(v_lancamento_ids)
     OR extrato_id = ANY(v_extrato_ids);

  DELETE FROM public.contas_receber_baixas
  WHERE conta_id = ANY(v_contas_receber_ids)
     OR conta_bancaria_id = ANY(v_conta_bancaria_ids)
     OR lancamento_financeiro_id = ANY(v_lancamento_ids)
     OR extrato_id = ANY(v_extrato_ids);

  DELETE FROM public.lancamentos_financeiros
  WHERE id = ANY(v_lancamento_ids)
     OR granja_id = ANY(v_granja_ids)
     OR extrato_id = ANY(v_extrato_ids);

  DELETE FROM public.contas_pagar
  WHERE id = ANY(v_contas_pagar_ids)
     OR tenant_id = _tenant_id
     OR granja_id = ANY(v_granja_ids);

  DELETE FROM public.contas_receber
  WHERE id = ANY(v_contas_receber_ids)
     OR tenant_id = _tenant_id
     OR granja_id = ANY(v_granja_ids);

  DELETE FROM public.extratos_bancarios
  WHERE id = ANY(v_extrato_ids)
     OR conta_bancaria_id = ANY(v_conta_bancaria_ids);

  -- Documentos fiscais e dependências.
  DELETE FROM public.notas_fiscais_duplicatas WHERE nota_fiscal_id = ANY(v_nota_fiscal_ids);
  DELETE FROM public.notas_fiscais_referenciadas WHERE nota_fiscal_id = ANY(v_nota_fiscal_ids);
  DELETE FROM public.notas_fiscais_itens WHERE nota_fiscal_id = ANY(v_nota_fiscal_ids);

  DELETE FROM public.notas_deposito_emitidas
  WHERE granja_id = ANY(v_granja_ids)
     OR nota_fiscal_id = ANY(v_nota_fiscal_ids)
     OR inscricao_produtor_id = ANY(v_inscricao_ids);

  DELETE FROM public.transferencias_deposito
  WHERE granja_origem_id = ANY(v_granja_ids)
     OR granja_destino_id = ANY(v_granja_ids)
     OR inscricao_origem_id = ANY(v_inscricao_ids)
     OR inscricao_destino_id = ANY(v_inscricao_ids);

  DELETE FROM public.devolucoes_deposito
  WHERE granja_id = ANY(v_granja_ids)
     OR nota_fiscal_id = ANY(v_nota_fiscal_ids)
     OR inscricao_produtor_id = ANY(v_inscricao_ids)
     OR inscricao_emitente_id = ANY(v_inscricao_ids)
     OR inscricao_recebe_taxa_id = ANY(v_inscricao_ids);

  DELETE FROM public.compras_cereais_notas_referenciadas
  WHERE compra_id = ANY(v_compra_ids);

  DELETE FROM public.remessas_venda
  WHERE tenant_id = _tenant_id
     OR contrato_venda_id IN (SELECT id FROM public.contratos_venda WHERE tenant_id = _tenant_id OR granja_id = ANY(v_granja_ids))
     OR nota_fiscal_id = ANY(v_nota_fiscal_ids);

  DELETE FROM public.compras_cereais
  WHERE id = ANY(v_compra_ids)
     OR granja_id = ANY(v_granja_ids)
     OR nota_fiscal_id = ANY(v_nota_fiscal_ids);

  DELETE FROM public.entradas_nfe_itens
  WHERE entrada_nfe_id = ANY(v_entrada_nfe_ids);

  DELETE FROM public.contratos_venda
  WHERE tenant_id = _tenant_id
     OR granja_id = ANY(v_granja_ids)
     OR inscricao_produtor_id = ANY(v_inscricao_ids)
     OR contra_nota_entrada_id = ANY(v_entrada_nfe_ids);

  DELETE FROM public.entradas_nfe
  WHERE id = ANY(v_entrada_nfe_ids)
     OR granja_id = ANY(v_granja_ids)
     OR inscricao_produtor_id = ANY(v_inscricao_ids);

  DELETE FROM public.notas_fiscais
  WHERE id = ANY(v_nota_fiscal_ids)
     OR tenant_id = _tenant_id
     OR granja_id = ANY(v_granja_ids)
     OR inscricao_produtor_id = ANY(v_inscricao_ids)
     OR inscricao_remetente_id = ANY(v_inscricao_ids)
     OR emitente_id = ANY(v_emitente_ids);

  -- Lavoura e estoque.
  DELETE FROM public.colheitas
  WHERE controle_lavoura_id = ANY(v_controle_lavoura_ids)
     OR inscricao_produtor_id = ANY(v_inscricao_ids)
     OR safra_id IN (SELECT id FROM public.safras WHERE tenant_id = _tenant_id);

  DELETE FROM public.aplicacoes WHERE tenant_id = _tenant_id OR controle_lavoura_id = ANY(v_controle_lavoura_ids);
  DELETE FROM public.plantios WHERE tenant_id = _tenant_id OR controle_lavoura_id = ANY(v_controle_lavoura_ids);
  DELETE FROM public.chuvas WHERE tenant_id = _tenant_id OR controle_lavoura_id = ANY(v_controle_lavoura_ids);
  DELETE FROM public.floracoes WHERE tenant_id = _tenant_id OR controle_lavoura_id = ANY(v_controle_lavoura_ids);
  DELETE FROM public.insetos WHERE tenant_id = _tenant_id OR controle_lavoura_id = ANY(v_controle_lavoura_ids);
  DELETE FROM public.plantas_invasoras WHERE tenant_id = _tenant_id OR controle_lavoura_id = ANY(v_controle_lavoura_ids);
  DELETE FROM public.analises_solo WHERE tenant_id = _tenant_id OR controle_lavoura_id = ANY(v_controle_lavoura_ids);
  DELETE FROM public.pivos WHERE tenant_id = _tenant_id OR controle_lavoura_id = ANY(v_controle_lavoura_ids);
  DELETE FROM public.controle_lavouras WHERE id = ANY(v_controle_lavoura_ids) OR tenant_id = _tenant_id OR granja_id = ANY(v_granja_ids);

  DELETE FROM public.estoque_produtos WHERE granja_id = ANY(v_granja_ids);

  -- Cadastros dependentes de granja/produtor/inscrição.
  DELETE FROM public.dfe_nfes_cache
  WHERE tenant_id = _tenant_id
     OR inscricao_id = ANY(v_inscricao_ids);

  DELETE FROM public.inscricoes_produtor
  WHERE id = ANY(v_inscricao_ids)
     OR granja_id = ANY(v_granja_ids)
     OR emitente_id = ANY(v_emitente_ids);

  DELETE FROM public.emitentes_nfe_credentials WHERE emitente_id = ANY(v_emitente_ids);
  DELETE FROM public.emitentes_nfe WHERE id = ANY(v_emitente_ids) OR granja_id = ANY(v_granja_ids);
  DELETE FROM public.contas_bancarias WHERE id = ANY(v_conta_bancaria_ids) OR tenant_id = _tenant_id OR granja_id = ANY(v_granja_ids);
  DELETE FROM public.produtores WHERE granja_id = ANY(v_granja_ids);

  -- Cadastros gerais do tenant.
  DELETE FROM public.lavouras WHERE tenant_id = _tenant_id OR granja_id = ANY(v_granja_ids);
  DELETE FROM public.silos WHERE tenant_id = _tenant_id OR granja_id = ANY(v_granja_ids);
  DELETE FROM public.produtos WHERE tenant_id = _tenant_id OR granja_id = ANY(v_granja_ids);
  DELETE FROM public.placas WHERE tenant_id = _tenant_id OR granja_id = ANY(v_granja_ids);
  DELETE FROM public.transportadoras WHERE tenant_id = _tenant_id OR granja_id = ANY(v_granja_ids);
  DELETE FROM public.clientes_fornecedores WHERE tenant_id = _tenant_id OR granja_id = ANY(v_granja_ids);
  DELETE FROM public.locais_entrega WHERE tenant_id = _tenant_id OR granja_id = ANY(v_granja_ids);
  DELETE FROM public.tabela_umidades WHERE tenant_id = _tenant_id;
  DELETE FROM public.grupos_produtos WHERE tenant_id = _tenant_id;
  DELETE FROM public.unidades_medida WHERE tenant_id = _tenant_id;
  DELETE FROM public.sub_centros_custo WHERE tenant_id = _tenant_id;
  DELETE FROM public.plano_contas_gerencial WHERE tenant_id = _tenant_id;
  DELETE FROM public.dre_contas WHERE tenant_id = _tenant_id;
  DELETE FROM public.configuracoes_balanca WHERE tenant_id = _tenant_id;
  DELETE FROM public.safras WHERE tenant_id = _tenant_id;
  DELETE FROM public.culturas WHERE tenant_id = _tenant_id;

  -- Granjas por último, preservando o cadastro da empresa contratante.
  DELETE FROM public.granjas WHERE tenant_id = _tenant_id;

  RETURN jsonb_build_object('status', 'success');
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao limpar dados da empresa: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_tenant_data(uuid) TO authenticated;