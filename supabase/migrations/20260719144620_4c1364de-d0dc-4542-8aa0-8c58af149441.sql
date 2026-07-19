
ALTER TABLE public.safras ADD COLUMN IF NOT EXISTS is_principal boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.handle_principal_safra()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_principal = true THEN
    UPDATE public.safras
       SET is_principal = false
     WHERE tenant_id IS NOT DISTINCT FROM NEW.tenant_id
       AND id <> NEW.id
       AND is_principal = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_principal_safra ON public.safras;
CREATE TRIGGER trg_handle_principal_safra
BEFORE INSERT OR UPDATE OF is_principal ON public.safras
FOR EACH ROW EXECUTE FUNCTION public.handle_principal_safra();
