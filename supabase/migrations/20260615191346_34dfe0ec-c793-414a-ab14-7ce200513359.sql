ALTER TABLE public.contas_bancarias ADD COLUMN IF NOT EXISTS is_padrao_granja boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS contas_bancarias_padrao_granja_unq
  ON public.contas_bancarias(granja_id)
  WHERE is_padrao_granja = true AND granja_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_conta_bancaria_padrao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_padrao_granja = true AND NEW.granja_id IS NOT NULL THEN
    UPDATE public.contas_bancarias
       SET is_padrao_granja = false
     WHERE granja_id = NEW.granja_id
       AND id <> NEW.id
       AND is_padrao_granja = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conta_bancaria_padrao ON public.contas_bancarias;
CREATE TRIGGER trg_conta_bancaria_padrao
BEFORE INSERT OR UPDATE ON public.contas_bancarias
FOR EACH ROW EXECUTE FUNCTION public.handle_conta_bancaria_padrao();