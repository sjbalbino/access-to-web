ALTER TABLE public.contas_receber_baixas ADD COLUMN IF NOT EXISTS numero_recibo TEXT;
ALTER TABLE public.contas_receber_baixas ADD COLUMN IF NOT EXISTS tenant_id UUID;

UPDATE public.contas_receber_baixas b
   SET tenant_id = c.tenant_id
  FROM public.contas_receber c
 WHERE c.id = b.conta_id AND b.tenant_id IS NULL;

CREATE OR REPLACE FUNCTION public.set_baixa_tenant_from_conta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.conta_id IS NOT NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.contas_receber WHERE id = NEW.conta_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_baixa_tenant ON public.contas_receber_baixas;
CREATE TRIGGER trg_set_baixa_tenant
BEFORE INSERT OR UPDATE ON public.contas_receber_baixas
FOR EACH ROW EXECUTE FUNCTION public.set_baixa_tenant_from_conta();

CREATE UNIQUE INDEX IF NOT EXISTS uq_crb_numero_recibo_tenant
  ON public.contas_receber_baixas (tenant_id, numero_recibo)
  WHERE numero_recibo IS NOT NULL;

CREATE OR REPLACE FUNCTION public.proximo_numero_recibo(_tenant uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max BIGINT;
BEGIN
  SELECT COALESCE(MAX(CASE WHEN numero_recibo ~ '^[0-9]+$' THEN numero_recibo::bigint ELSE 0 END), 0)
    INTO v_max
  FROM public.contas_receber_baixas
  WHERE tenant_id = _tenant;
  RETURN (v_max + 1)::text;
END;
$$;