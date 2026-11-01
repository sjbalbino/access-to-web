CREATE OR REPLACE FUNCTION public.set_colheita_data_servidor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Pesagem de entrada (tara ainda não informada): data oficial = data do servidor em Brasília.
  -- Importações do legado (com tara) mantêm a data original.
  IF NEW.data_colheita IS NULL OR COALESCE(NEW.peso_tara, 0) = 0 THEN
    NEW.data_colheita := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_colheita_data_servidor ON public.colheitas;
CREATE TRIGGER trg_colheita_data_servidor
BEFORE INSERT ON public.colheitas
FOR EACH ROW EXECUTE FUNCTION public.set_colheita_data_servidor();