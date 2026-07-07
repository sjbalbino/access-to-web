
ALTER TABLE public.silos ADD COLUMN IF NOT EXISTS is_padrao BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.handle_silo_padrao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_padrao = true THEN
    UPDATE public.silos
       SET is_padrao = false
     WHERE id <> NEW.id
       AND is_padrao = true
       AND (
         (NEW.granja_id IS NULL AND granja_id IS NULL)
         OR granja_id = NEW.granja_id
       );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_silo_padrao ON public.silos;
CREATE TRIGGER trg_handle_silo_padrao
BEFORE INSERT OR UPDATE ON public.silos
FOR EACH ROW EXECUTE FUNCTION public.handle_silo_padrao();
