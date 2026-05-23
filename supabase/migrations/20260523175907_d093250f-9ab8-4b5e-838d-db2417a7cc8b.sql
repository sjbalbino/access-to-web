
-- 1. Participação % do sócio (produtor) na granja
ALTER TABLE public.produtores
  ADD COLUMN IF NOT EXISTS percentual_participacao NUMERIC(5,2) NOT NULL DEFAULT 0;

-- 2. Colunas de modo + sócio único nas origens
ALTER TABLE public.lancamentos_financeiros
  ADD COLUMN IF NOT EXISTS rateio_modo TEXT NOT NULL DEFAULT 'rateio_granja' CHECK (rateio_modo IN ('socio_unico','rateio_granja','manual')),
  ADD COLUMN IF NOT EXISTS socio_produtor_id UUID REFERENCES public.produtores(id);

ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS rateio_modo TEXT NOT NULL DEFAULT 'rateio_granja' CHECK (rateio_modo IN ('socio_unico','rateio_granja','manual')),
  ADD COLUMN IF NOT EXISTS socio_produtor_id UUID REFERENCES public.produtores(id);

ALTER TABLE public.contas_receber
  ADD COLUMN IF NOT EXISTS rateio_modo TEXT NOT NULL DEFAULT 'rateio_granja' CHECK (rateio_modo IN ('socio_unico','rateio_granja','manual')),
  ADD COLUMN IF NOT EXISTS socio_produtor_id UUID REFERENCES public.produtores(id);

ALTER TABLE public.contas_pagar_baixas
  ADD COLUMN IF NOT EXISTS rateio_modo TEXT,
  ADD COLUMN IF NOT EXISTS socio_produtor_id UUID REFERENCES public.produtores(id);

ALTER TABLE public.contas_receber_baixas
  ADD COLUMN IF NOT EXISTS rateio_modo TEXT,
  ADD COLUMN IF NOT EXISTS socio_produtor_id UUID REFERENCES public.produtores(id);

-- 3. Tabela polimórfica de rateios
CREATE TABLE IF NOT EXISTS public.lancamento_rateio_socios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  origem_tipo TEXT NOT NULL CHECK (origem_tipo IN ('lancamento','cp','cr','cp_baixa','cr_baixa')),
  origem_id UUID NOT NULL,
  socio_produtor_id UUID NOT NULL REFERENCES public.produtores(id),
  percentual NUMERIC(7,4) NOT NULL,
  valor NUMERIC(14,2) NOT NULL,
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rateio_origem ON public.lancamento_rateio_socios(origem_tipo, origem_id);
CREATE INDEX IF NOT EXISTS idx_rateio_socio ON public.lancamento_rateio_socios(socio_produtor_id);
CREATE INDEX IF NOT EXISTS idx_rateio_tenant ON public.lancamento_rateio_socios(tenant_id);

ALTER TABLE public.lancamento_rateio_socios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rateio_select ON public.lancamento_rateio_socios;
CREATE POLICY rateio_select ON public.lancamento_rateio_socios FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS rateio_insert ON public.lancamento_rateio_socios;
CREATE POLICY rateio_insert ON public.lancamento_rateio_socios FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS rateio_update ON public.lancamento_rateio_socios;
CREATE POLICY rateio_update ON public.lancamento_rateio_socios FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS rateio_delete ON public.lancamento_rateio_socios;
CREATE POLICY rateio_delete ON public.lancamento_rateio_socios FOR DELETE TO authenticated
  USING ((tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()))
         AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente')));

-- 4. Função que (re)gera o rateio para uma origem
CREATE OR REPLACE FUNCTION public.gerar_rateio_socios(
  _origem_tipo TEXT,
  _origem_id UUID
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_modo TEXT;
  v_socio UUID;
  v_valor NUMERIC;
  v_granja UUID;
  v_tenant UUID;
  v_soma_pct NUMERIC;
  r RECORD;
BEGIN
  -- Carrega dados da origem
  IF _origem_tipo = 'lancamento' THEN
    SELECT rateio_modo, socio_produtor_id, valor, granja_id, tenant_id
      INTO v_modo, v_socio, v_valor, v_granja, v_tenant
    FROM lancamentos_financeiros WHERE id = _origem_id;
  ELSIF _origem_tipo = 'cp' THEN
    SELECT rateio_modo, socio_produtor_id, valor_original, granja_id, tenant_id
      INTO v_modo, v_socio, v_valor, v_granja, v_tenant
    FROM contas_pagar WHERE id = _origem_id;
  ELSIF _origem_tipo = 'cr' THEN
    SELECT rateio_modo, socio_produtor_id, valor_original, granja_id, tenant_id
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
    -- UI grava manualmente; apenas garante coerência de tenant
    UPDATE lancamento_rateio_socios SET tenant_id = v_tenant
    WHERE origem_tipo = _origem_tipo AND origem_id = _origem_id;
    RETURN;
  END IF;

  -- Limpa rateio anterior
  DELETE FROM lancamento_rateio_socios
   WHERE origem_tipo = _origem_tipo AND origem_id = _origem_id;

  IF v_valor IS NULL OR v_valor = 0 THEN RETURN; END IF;

  IF v_modo = 'socio_unico' AND v_socio IS NOT NULL THEN
    INSERT INTO lancamento_rateio_socios
      (origem_tipo, origem_id, socio_produtor_id, percentual, valor, tenant_id)
    VALUES (_origem_tipo, _origem_id, v_socio, 100, v_valor, v_tenant);
    RETURN;
  END IF;

  -- rateio_granja
  IF v_granja IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(percentual_participacao),0) INTO v_soma_pct
    FROM produtores WHERE granja_id = v_granja AND ativo = true AND percentual_participacao > 0;

  IF v_soma_pct <= 0 THEN
    -- Sem % cadastrado: divide igualmente entre sócios ativos
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

-- 5. Triggers genéricos
CREATE OR REPLACE FUNCTION public.trg_gerar_rateio()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tipo TEXT;
BEGIN
  v_tipo := TG_ARGV[0];
  IF TG_OP = 'DELETE' THEN
    DELETE FROM lancamento_rateio_socios WHERE origem_tipo = v_tipo AND origem_id = OLD.id;
    RETURN OLD;
  END IF;
  PERFORM gerar_rateio_socios(v_tipo, NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rateio_lancamento ON public.lancamentos_financeiros;
CREATE TRIGGER trg_rateio_lancamento
AFTER INSERT OR UPDATE OF valor, rateio_modo, socio_produtor_id, granja_id OR DELETE
ON public.lancamentos_financeiros
FOR EACH ROW EXECUTE FUNCTION public.trg_gerar_rateio('lancamento');

DROP TRIGGER IF EXISTS trg_rateio_cp ON public.contas_pagar;
CREATE TRIGGER trg_rateio_cp
AFTER INSERT OR UPDATE OF valor_original, rateio_modo, socio_produtor_id, granja_id OR DELETE
ON public.contas_pagar
FOR EACH ROW EXECUTE FUNCTION public.trg_gerar_rateio('cp');

DROP TRIGGER IF EXISTS trg_rateio_cr ON public.contas_receber;
CREATE TRIGGER trg_rateio_cr
AFTER INSERT OR UPDATE OF valor_original, rateio_modo, socio_produtor_id, granja_id OR DELETE
ON public.contas_receber
FOR EACH ROW EXECUTE FUNCTION public.trg_gerar_rateio('cr');

DROP TRIGGER IF EXISTS trg_rateio_cp_baixa ON public.contas_pagar_baixas;
CREATE TRIGGER trg_rateio_cp_baixa
AFTER INSERT OR UPDATE OF valor_pago, juros, multa, desconto, rateio_modo, socio_produtor_id OR DELETE
ON public.contas_pagar_baixas
FOR EACH ROW EXECUTE FUNCTION public.trg_gerar_rateio('cp_baixa');

DROP TRIGGER IF EXISTS trg_rateio_cr_baixa ON public.contas_receber_baixas;
CREATE TRIGGER trg_rateio_cr_baixa
AFTER INSERT OR UPDATE OF valor_pago, juros, multa, desconto, rateio_modo, socio_produtor_id OR DELETE
ON public.contas_receber_baixas
FOR EACH ROW EXECUTE FUNCTION public.trg_gerar_rateio('cr_baixa');

-- 6. Backfill: gera rateio para registros existentes (modo default = rateio_granja)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM lancamentos_financeiros LOOP
    PERFORM gerar_rateio_socios('lancamento', r.id);
  END LOOP;
  FOR r IN SELECT id FROM contas_pagar LOOP
    PERFORM gerar_rateio_socios('cp', r.id);
  END LOOP;
  FOR r IN SELECT id FROM contas_receber LOOP
    PERFORM gerar_rateio_socios('cr', r.id);
  END LOOP;
  FOR r IN SELECT id FROM contas_pagar_baixas LOOP
    PERFORM gerar_rateio_socios('cp_baixa', r.id);
  END LOOP;
  FOR r IN SELECT id FROM contas_receber_baixas LOOP
    PERFORM gerar_rateio_socios('cr_baixa', r.id);
  END LOOP;
END $$;
