CREATE OR REPLACE FUNCTION public.validar_emitente_principal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(NEW.is_emitente_principal, false) = true THEN
    IF NEW.emitente_id IS NULL THEN
      RAISE EXCEPTION 'Somente inscrições com emitente de NF-e configurado (API ativa) podem ser emitente principal da granja.';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.emitentes_nfe e
      WHERE e.id = NEW.emitente_id
        AND COALESCE(e.ativo, false) = true
        AND COALESCE(e.api_configurada, false) = true
    ) THEN
      RAISE EXCEPTION 'Somente inscrições com emitente de NF-e configurado (API ativa) podem ser emitente principal da granja.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_emitente_principal ON public.inscricoes_produtor;

CREATE TRIGGER trg_validar_emitente_principal
BEFORE INSERT OR UPDATE ON public.inscricoes_produtor
FOR EACH ROW EXECUTE FUNCTION public.validar_emitente_principal();