
CREATE OR REPLACE FUNCTION public.set_colheita_safra_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.controle_lavoura_id IS NOT NULL THEN
    SELECT safra_id INTO NEW.safra_id
    FROM controle_lavouras
    WHERE id = NEW.controle_lavoura_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_colheita_safra_id
BEFORE INSERT OR UPDATE OF controle_lavoura_id ON public.colheitas
FOR EACH ROW
EXECUTE FUNCTION public.set_colheita_safra_id();
