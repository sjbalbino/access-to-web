
CREATE OR REPLACE FUNCTION public.cleanup_tenant_data(_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted jsonb := '{}'::jsonb;
  v_count bigint;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas super administradores podem limpar dados de tenants';
  END IF;
  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id obrigatório';
  END IF;

  -- Baixas
  DELETE FROM contas_pagar_baixas WHERE conta_id IN (SELECT id FROM contas_pagar WHERE tenant_id = _tenant_id);
  DELETE FROM contas_receber_baixas WHERE conta_id IN (SELECT id FROM contas_receber WHERE tenant_id = _tenant_id);
  -- Rateios órfãos
  DELETE FROM lancamento_rateio_socios WHERE tenant_id = _tenant_id;
  DELETE FROM lancamentos_financeiros WHERE tenant_id = _tenant_id;
  DELETE FROM contas_pagar WHERE tenant_id = _tenant_id;
  DELETE FROM contas_receber WHERE tenant_id = _tenant_id;
  DELETE FROM extratos_bancarios WHERE tenant_id = _tenant_id;

  -- Notas fiscais e filhas
  DELETE FROM notas_fiscais_duplicatas WHERE nota_fiscal_id IN (SELECT id FROM notas_fiscais WHERE tenant_id = _tenant_id);
  DELETE FROM notas_fiscais_referenciadas WHERE nota_fiscal_id IN (SELECT id FROM notas_fiscais WHERE tenant_id = _tenant_id);
  DELETE FROM notas_fiscais_itens WHERE nota_fiscal_id IN (SELECT id FROM notas_fiscais WHERE tenant_id = _tenant_id);

  -- Notas depósito, transferências, devoluções
  DELETE FROM notas_deposito_emitidas WHERE granja_id IN (SELECT id FROM granjas WHERE tenant_id = _tenant_id);
  DELETE FROM transferencias_deposito WHERE tenant_id = _tenant_id;
  DELETE FROM devolucoes_deposito WHERE granja_id IN (SELECT id FROM granjas WHERE tenant_id = _tenant_id);

  -- Compras cereais
  DELETE FROM compras_cereais_notas_referenciadas WHERE compra_cereais_id IN (SELECT id FROM compras_cereais WHERE granja_id IN (SELECT id FROM granjas WHERE tenant_id = _tenant_id));
  DELETE FROM compras_cereais WHERE granja_id IN (SELECT id FROM granjas WHERE tenant_id = _tenant_id);

  -- Entradas NFe
  DELETE FROM entradas_nfe_itens WHERE entrada_nfe_id IN (SELECT id FROM entradas_nfe WHERE granja_id IN (SELECT id FROM granjas WHERE tenant_id = _tenant_id));
  DELETE FROM entradas_nfe WHERE granja_id IN (SELECT id FROM granjas WHERE tenant_id = _tenant_id);

  -- Remessas / Contratos
  DELETE FROM remessas_venda WHERE tenant_id = _tenant_id;
  DELETE FROM contratos_venda WHERE tenant_id = _tenant_id;

  -- Notas fiscais (após dependências)
  DELETE FROM notas_fiscais WHERE tenant_id = _tenant_id;

  -- Controle lavoura e filhas
  DELETE FROM colheitas WHERE controle_lavoura_id IN (SELECT id FROM controle_lavouras WHERE tenant_id = _tenant_id);
  DELETE FROM aplicacoes WHERE tenant_id = _tenant_id;
  DELETE FROM plantios WHERE tenant_id = _tenant_id;
  DELETE FROM chuvas WHERE tenant_id = _tenant_id;
  DELETE FROM floracoes WHERE tenant_id = _tenant_id;
  DELETE FROM insetos WHERE tenant_id = _tenant_id;
  DELETE FROM plantas_invasoras WHERE tenant_id = _tenant_id;
  DELETE FROM analises_solo WHERE tenant_id = _tenant_id;
  DELETE FROM pivos WHERE tenant_id = _tenant_id;
  DELETE FROM controle_lavouras WHERE tenant_id = _tenant_id;

  -- Estoques
  DELETE FROM estoque_produtos WHERE granja_id IN (SELECT id FROM granjas WHERE tenant_id = _tenant_id);

  -- Inscrições / Emitentes / Produtores
  DELETE FROM inscricoes_produtor WHERE granja_id IN (SELECT id FROM granjas WHERE tenant_id = _tenant_id);
  DELETE FROM emitentes_nfe_credentials WHERE emitente_id IN (SELECT id FROM emitentes_nfe WHERE granja_id IN (SELECT id FROM granjas WHERE tenant_id = _tenant_id));
  DELETE FROM emitentes_nfe WHERE granja_id IN (SELECT id FROM granjas WHERE tenant_id = _tenant_id);
  DELETE FROM produtores WHERE granja_id IN (SELECT id FROM granjas WHERE tenant_id = _tenant_id);

  -- Cadastros gerais do tenant
  DELETE FROM lavouras WHERE tenant_id = _tenant_id;
  DELETE FROM silos WHERE tenant_id = _tenant_id;
  DELETE FROM produtos WHERE tenant_id = _tenant_id;
  DELETE FROM placas WHERE tenant_id = _tenant_id;
  DELETE FROM transportadoras WHERE tenant_id = _tenant_id;
  DELETE FROM clientes_fornecedores WHERE tenant_id = _tenant_id;
  DELETE FROM locais_entrega WHERE tenant_id = _tenant_id;
  DELETE FROM safras WHERE tenant_id = _tenant_id;
  DELETE FROM culturas WHERE tenant_id = _tenant_id;
  DELETE FROM tabela_umidades WHERE tenant_id = _tenant_id;
  DELETE FROM grupos_produtos WHERE tenant_id = _tenant_id;
  DELETE FROM unidades_medida WHERE tenant_id = _tenant_id;
  DELETE FROM sub_centros_custo WHERE tenant_id = _tenant_id;
  DELETE FROM plano_contas_gerencial WHERE tenant_id = _tenant_id;
  DELETE FROM dre_contas WHERE tenant_id = _tenant_id;
  DELETE FROM contas_bancarias WHERE tenant_id = _tenant_id;
  DELETE FROM configuracoes_balanca WHERE tenant_id = _tenant_id;

  -- Granjas (por último)
  DELETE FROM granjas WHERE tenant_id = _tenant_id;

  RETURN jsonb_build_object('status', 'success');
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_tenant_data(uuid) TO authenticated;
