CREATE TRIGGER trg_handle_principal_granja
BEFORE INSERT OR UPDATE ON public.granjas
FOR EACH ROW
EXECUTE FUNCTION public.handle_principal_granja();