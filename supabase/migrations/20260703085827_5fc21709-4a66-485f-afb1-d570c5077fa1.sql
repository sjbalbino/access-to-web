
CREATE OR REPLACE FUNCTION public.recalc_nota_fiscal_totais(_nota_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM public.notas_fiscais WHERE id = _nota_id;
  -- Não recalcula notas já autorizadas/canceladas para preservar histórico fiscal
  IF v_status IN ('autorizado','autorizada','cancelada','cancelado','denegada','inutilizada') THEN
    -- Permite recálculo apenas se totais estiverem zerados (backfill de notas legadas)
    IF (SELECT COALESCE(total_nota,0) FROM public.notas_fiscais WHERE id = _nota_id) > 0 THEN
      RETURN;
    END IF;
  END IF;

  UPDATE public.notas_fiscais nf
  SET
    total_produtos = COALESCE(t.total_produtos, 0),
    total_icms     = COALESCE(t.total_icms, 0),
    total_pis      = COALESCE(t.total_pis, 0),
    total_cofins   = COALESCE(t.total_cofins, 0),
    total_ibs      = COALESCE(t.total_ibs, 0),
    total_cbs      = COALESCE(t.total_cbs, 0),
    total_is       = COALESCE(t.total_is, 0),
    total_nota     = COALESCE(t.total_produtos, 0) - COALESCE(t.total_desconto, 0),
    valor_pagamento = COALESCE(t.total_produtos, 0) - COALESCE(t.total_desconto, 0)
  FROM (
    SELECT
      SUM(COALESCE(valor_total,0))    AS total_produtos,
      SUM(COALESCE(valor_desconto,0)) AS total_desconto,
      SUM(COALESCE(valor_icms,0))     AS total_icms,
      SUM(COALESCE(valor_pis,0))      AS total_pis,
      SUM(COALESCE(valor_cofins,0))   AS total_cofins,
      SUM(COALESCE(valor_ibs,0))      AS total_ibs,
      SUM(COALESCE(valor_cbs,0))      AS total_cbs,
      SUM(COALESCE(valor_is,0))       AS total_is
    FROM public.notas_fiscais_itens
    WHERE nota_fiscal_id = _nota_id
  ) t
  WHERE nf.id = _nota_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_nota_fiscal_totais()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_nota_fiscal_totais(OLD.nota_fiscal_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalc_nota_fiscal_totais(NEW.nota_fiscal_id);
  IF TG_OP = 'UPDATE' AND OLD.nota_fiscal_id IS DISTINCT FROM NEW.nota_fiscal_id THEN
    PERFORM public.recalc_nota_fiscal_totais(OLD.nota_fiscal_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_nota_fiscal_totais ON public.notas_fiscais_itens;
CREATE TRIGGER trg_recalc_nota_fiscal_totais
AFTER INSERT OR UPDATE OR DELETE ON public.notas_fiscais_itens
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_nota_fiscal_totais();

-- Backfill: notas com totais zerados mas com itens
UPDATE public.notas_fiscais nf
SET
  total_produtos = t.total_produtos,
  total_icms     = t.total_icms,
  total_pis      = t.total_pis,
  total_cofins   = t.total_cofins,
  total_ibs      = t.total_ibs,
  total_cbs      = t.total_cbs,
  total_is       = t.total_is,
  total_nota     = t.total_produtos - t.total_desconto,
  valor_pagamento = t.total_produtos - t.total_desconto
FROM (
  SELECT
    nota_fiscal_id,
    SUM(COALESCE(valor_total,0))    AS total_produtos,
    SUM(COALESCE(valor_desconto,0)) AS total_desconto,
    SUM(COALESCE(valor_icms,0))     AS total_icms,
    SUM(COALESCE(valor_pis,0))      AS total_pis,
    SUM(COALESCE(valor_cofins,0))   AS total_cofins,
    SUM(COALESCE(valor_ibs,0))      AS total_ibs,
    SUM(COALESCE(valor_cbs,0))      AS total_cbs,
    SUM(COALESCE(valor_is,0))       AS total_is
  FROM public.notas_fiscais_itens
  GROUP BY nota_fiscal_id
) t
WHERE nf.id = t.nota_fiscal_id
  AND COALESCE(nf.total_nota,0) = 0
  AND t.total_produtos > 0;
