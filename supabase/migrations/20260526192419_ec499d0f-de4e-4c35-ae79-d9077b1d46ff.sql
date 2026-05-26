CREATE OR REPLACE FUNCTION public.gerar_rateio_socios(_origem_tipo text, _origem_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_modo TEXT;
  v_socio UUID;
  v_valor NUMERIC;
  v_granja UUID;
  v_tenant UUID;
  v_soma_pct NUMERIC;
  v_fallback_modo TEXT;
  v_fallback_socio UUID;
BEGIN
  IF _origem_tipo = 'lancamento' THEN
    SELECT rateio_modo, socio_produtor_id, valor, granja_id, tenant_id
      INTO v_modo, v_socio, v_valor, v_granja, v_tenant
    FROM lancamentos_financeiros WHERE id = _origem_id;
  ELSIF _origem_tipo = 'cp' THEN
    SELECT rateio_modo, socio_produtor_id, valor_original, granja_id, tenant_id
      INTO v_modo, v_socio, v_valor, v_granja, v_tenant
    FROM contas_pagar WHERE id = _origem_id;
  ELSIF _origem_tipo = 'cr' THEN
    SELECT rateio_modo, socio_produtor_id, COALESCE(valor_receita_ir, valor_original), granja_id, tenant_id
      INTO v_modo, v_socio, v_valor, v_granja, v_tenant
    FROM contas_receber WHERE id = _origem_id;
  ELSIF _origem_tipo = 'cp_baixa' THEN
    SELECT b.rateio_modo, b.socio_produtor_id,
           (b.valor_pago + b.juros + b.multa - b.desconto), c.granja_id, c.tenant_id,
           c.rateio_modo, c.socio_produtor_id
      INTO v_modo, v_socio, v_valor, v_granja, v_tenant, v_fallback_modo, v_fallback_socio
    FROM contas_pagar_baixas b
    JOIN contas_pagar c ON c.id = b.conta_id
    WHERE b.id = _origem_id;
    IF v_modo IS NULL THEN v_modo := v_fallback_modo; v_socio := v_fallback_socio; END IF;
  ELSIF _origem_tipo = 'cr_baixa' THEN
    SELECT b.rateio_modo, b.socio_produtor_id,
           (b.valor_pago + b.juros + b.multa - b.desconto), c.granja_id, c.tenant_id,
           c.rateio_modo, c.socio_produtor_id
      INTO v_modo, v_socio, v_valor, v_granja, v_tenant, v_fallback_modo, v_fallback_socio
    FROM contas_receber_baixas b
    JOIN contas_receber c ON c.id = b.conta_id
    WHERE b.id = _origem_id;
    IF v_modo IS NULL THEN v_modo := v_fallback_modo; v_socio := v_fallback_socio; END IF;
  ELSE
    RETURN;
  END IF;

  IF v_modo = 'manual' THEN
    UPDATE lancamento_rateio_socios SET tenant_id = v_tenant
    WHERE origem_tipo = _origem_tipo AND origem_id = _origem_id;
    RETURN;
  END IF;

  DELETE FROM lancamento_rateio_socios
   WHERE origem_tipo = _origem_tipo AND origem_id = _origem_id;

  IF v_valor IS NULL OR v_valor = 0 THEN RETURN; END IF;

  IF v_modo = 'socio_unico' AND v_socio IS NOT NULL THEN
    INSERT INTO lancamento_rateio_socios
      (origem_tipo, origem_id, socio_produtor_id, percentual, valor, tenant_id)
    VALUES (_origem_tipo, _origem_id, v_socio, 100, v_valor, v_tenant);
    RETURN;
  END IF;

  IF v_granja IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(percentual_participacao),0) INTO v_soma_pct
    FROM produtores WHERE granja_id = v_granja AND ativo = true AND percentual_participacao > 0;

  IF v_soma_pct <= 0 THEN
    INSERT INTO lancamento_rateio_socios
      (origem_tipo, origem_id, socio_produtor_id, percentual, valor, tenant_id)
    SELECT _origem_tipo, _origem_id, p.id,
           ROUND(100.0 / NULLIF(COUNT(*) OVER (),0), 4),
           ROUND(v_valor / NULLIF(COUNT(*) OVER (),0), 2),
           v_tenant
    FROM produtores p
    WHERE p.granja_id = v_granja AND p.ativo = true;
    RETURN;
  END IF;

  INSERT INTO lancamento_rateio_socios
    (origem_tipo, origem_id, socio_produtor_id, percentual, valor, tenant_id)
  SELECT _origem_tipo, _origem_id, p.id,
         ROUND(p.percentual_participacao * 100.0 / v_soma_pct, 4),
         ROUND(v_valor * p.percentual_participacao / v_soma_pct, 2),
         v_tenant
  FROM produtores p
  WHERE p.granja_id = v_granja AND p.ativo = true AND p.percentual_participacao > 0;
END;
$function$;