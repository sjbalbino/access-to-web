
-- 1. Adicionar colunas em entradas_nfe
ALTER TABLE public.entradas_nfe
  ADD COLUMN IF NOT EXISTS contrato_venda_id UUID REFERENCES public.contratos_venda(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS eh_contra_nota BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_entradas_nfe_contrato_venda ON public.entradas_nfe(contrato_venda_id);

-- 2. Adicionar colunas em contratos_venda
ALTER TABLE public.contratos_venda
  ADD COLUMN IF NOT EXISTS contra_nota_entrada_id UUID REFERENCES public.entradas_nfe(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valor_contra_nota NUMERIC(14,2);

-- 3. Adicionar coluna em contas_receber
ALTER TABLE public.contas_receber
  ADD COLUMN IF NOT EXISTS valor_receita_ir NUMERIC(14,2);

-- Inicializa valor_receita_ir = valor_original quando NULL
UPDATE public.contas_receber SET valor_receita_ir = valor_original WHERE valor_receita_ir IS NULL;

-- 4. Função para recalcular valor_receita_ir das parcelas de um contrato
CREATE OR REPLACE FUNCTION public.atualizar_valor_receita_ir(_contrato_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor_contra NUMERIC;
  v_soma_orig NUMERIC;
BEGIN
  SELECT valor_contra_nota INTO v_valor_contra
  FROM contratos_venda WHERE id = _contrato_id;

  SELECT COALESCE(SUM(valor_original), 0) INTO v_soma_orig
  FROM contas_receber WHERE contrato_venda_id = _contrato_id;

  IF v_valor_contra IS NULL OR v_valor_contra <= 0 OR v_soma_orig <= 0 THEN
    UPDATE contas_receber
       SET valor_receita_ir = valor_original
     WHERE contrato_venda_id = _contrato_id;
  ELSE
    UPDATE contas_receber
       SET valor_receita_ir = ROUND(v_valor_contra * valor_original / v_soma_orig, 2)
     WHERE contrato_venda_id = _contrato_id;
  END IF;

  -- Reaplica rateio dos sócios para refletir nova receita IR
  PERFORM gerar_rateio_socios('cr', cr.id)
  FROM contas_receber cr
  WHERE cr.contrato_venda_id = _contrato_id;
END;
$$;

-- 5. Trigger em entradas_nfe: quando vincula/desvincula/atualiza valor, atualiza contrato
CREATE OR REPLACE FUNCTION public.trg_sync_contra_nota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_contrato UUID;
  v_new_contrato UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_contrato := OLD.contrato_venda_id;
    IF v_old_contrato IS NOT NULL THEN
      UPDATE contratos_venda
         SET contra_nota_entrada_id = NULL, valor_contra_nota = NULL
       WHERE id = v_old_contrato AND contra_nota_entrada_id = OLD.id;
      PERFORM atualizar_valor_receita_ir(v_old_contrato);
    END IF;
    RETURN OLD;
  END IF;

  v_new_contrato := NEW.contrato_venda_id;
  v_old_contrato := CASE WHEN TG_OP = 'UPDATE' THEN OLD.contrato_venda_id ELSE NULL END;

  -- Se desvinculou de um contrato
  IF v_old_contrato IS NOT NULL AND v_old_contrato IS DISTINCT FROM v_new_contrato THEN
    UPDATE contratos_venda
       SET contra_nota_entrada_id = NULL, valor_contra_nota = NULL
     WHERE id = v_old_contrato AND contra_nota_entrada_id = OLD.id;
    PERFORM atualizar_valor_receita_ir(v_old_contrato);
  END IF;

  -- Se está vinculada
  IF v_new_contrato IS NOT NULL THEN
    UPDATE contratos_venda
       SET contra_nota_entrada_id = NEW.id, valor_contra_nota = NEW.valor_total
     WHERE id = v_new_contrato;
    PERFORM atualizar_valor_receita_ir(v_new_contrato);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_entradas_nfe_contra_nota ON public.entradas_nfe;
CREATE TRIGGER trg_entradas_nfe_contra_nota
  AFTER INSERT OR UPDATE OF contrato_venda_id, valor_total OR DELETE
  ON public.entradas_nfe
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_contra_nota();

-- 6. Trigger em contas_receber: na inserção, definir valor_receita_ir baseado em contrato
CREATE OR REPLACE FUNCTION public.trg_set_valor_receita_ir()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.valor_receita_ir IS NULL THEN
    NEW.valor_receita_ir := NEW.valor_original;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contas_receber_receita_ir ON public.contas_receber;
CREATE TRIGGER trg_contas_receber_receita_ir
  BEFORE INSERT ON public.contas_receber
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_valor_receita_ir();

-- Após insert/update das parcelas, recalcula proporcionalmente se houver contra-nota
CREATE OR REPLACE FUNCTION public.trg_recalc_receita_ir_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_contrato UUID;
BEGIN
  v_contrato := COALESCE(NEW.contrato_venda_id, OLD.contrato_venda_id);
  IF v_contrato IS NOT NULL THEN
    PERFORM atualizar_valor_receita_ir(v_contrato);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_contas_receber_recalc_ir ON public.contas_receber;
CREATE TRIGGER trg_contas_receber_recalc_ir
  AFTER INSERT OR DELETE OR UPDATE OF valor_original, contrato_venda_id
  ON public.contas_receber
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_receita_ir_after();

-- 7. Ajusta gerar_rateio_socios para CR usar valor_receita_ir
CREATE OR REPLACE FUNCTION public.gerar_rateio_socios(_origem_tipo text, _origem_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_modo TEXT;
  v_socio UUID;
  v_valor NUMERIC;
  v_granja UUID;
  v_tenant UUID;
  v_soma_pct NUMERIC;
  r RECORD;
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
      INTO v_modo, v_socio, v_valor, v_granja, v_tenant, r.rateio_modo, r.socio
    FROM contas_pagar_baixas b
    JOIN contas_pagar c ON c.id = b.conta_id
    WHERE b.id = _origem_id;
    IF v_modo IS NULL THEN v_modo := r.rateio_modo; v_socio := r.socio; END IF;
  ELSIF _origem_tipo = 'cr_baixa' THEN
    SELECT b.rateio_modo, b.socio_produtor_id,
           (b.valor_pago + b.juros + b.multa - b.desconto), c.granja_id, c.tenant_id,
           c.rateio_modo, c.socio_produtor_id
      INTO v_modo, v_socio, v_valor, v_granja, v_tenant, r.rateio_modo, r.socio
    FROM contas_receber_baixas b
    JOIN contas_receber c ON c.id = b.conta_id
    WHERE b.id = _origem_id;
    IF v_modo IS NULL THEN v_modo := r.rateio_modo; v_socio := r.socio; END IF;
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
$$;
