UPDATE public.granjas SET tenant_id = '90082c70-2963-4e70-b02a-60a4380c687b' WHERE id = '3cce4e12-7f37-4538-b6c2-b6f5760449f8' AND tenant_id IS NULL;

CREATE OR REPLACE FUNCTION public.set_granjas_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_user_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_granjas_tenant ON public.granjas;
CREATE TRIGGER trg_set_granjas_tenant
BEFORE INSERT ON public.granjas
FOR EACH ROW EXECUTE FUNCTION public.set_granjas_tenant();