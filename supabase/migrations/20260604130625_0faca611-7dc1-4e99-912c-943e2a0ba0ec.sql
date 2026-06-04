CREATE OR REPLACE FUNCTION public.handle_principal_granja() 
RETURNS TRIGGER AS $$
BEGIN
    -- Se a granja atual está sendo marcada como principal
    IF NEW.is_principal = true THEN
        -- Desmarca qualquer outra granja do mesmo tenant que seja principal
        UPDATE public.granjas 
        SET is_principal = false 
        WHERE tenant_id = NEW.tenant_id 
          AND id <> NEW.id 
          AND is_principal = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_handle_principal_granja
BEFORE INSERT OR UPDATE OF is_principal ON public.granjas
FOR EACH ROW
WHEN (NEW.is_principal = true)
EXECUTE FUNCTION public.handle_principal_granja();
