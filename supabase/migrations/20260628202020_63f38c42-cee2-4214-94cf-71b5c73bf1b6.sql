
ALTER TABLE public.contas_pagar_baixas ADD COLUMN IF NOT EXISTS tenant_id uuid;

UPDATE public.contas_pagar_baixas b
   SET tenant_id = c.tenant_id
  FROM public.contas_pagar c
 WHERE b.conta_id = c.id AND b.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_contas_pagar_baixas_tenant_id ON public.contas_pagar_baixas(tenant_id);

CREATE OR REPLACE FUNCTION public.set_baixa_pagar_tenant_from_conta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.conta_id IS NOT NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.contas_pagar WHERE id = NEW.conta_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_baixa_pagar_tenant ON public.contas_pagar_baixas;
CREATE TRIGGER trg_set_baixa_pagar_tenant
BEFORE INSERT ON public.contas_pagar_baixas
FOR EACH ROW EXECUTE FUNCTION public.set_baixa_pagar_tenant_from_conta();
