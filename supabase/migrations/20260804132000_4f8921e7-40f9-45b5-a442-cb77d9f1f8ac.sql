CREATE OR REPLACE FUNCTION public.trg_sync_remessa_status_nfe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF lower(NEW.status) IN ('autorizado', 'autorizada') THEN
      UPDATE public.remessas_venda
         SET status = 'carregado_nfe',
             updated_at = now()
       WHERE nota_fiscal_id = NEW.id
         AND status <> 'carregado_nfe';
    ELSIF lower(NEW.status) IN ('cancelado', 'cancelada', 'inutilizado', 'inutilizada') THEN
      UPDATE public.remessas_venda
         SET status = 'carregado',
             nota_fiscal_id = NULL,
             updated_at = now()
       WHERE nota_fiscal_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_remessa_status_nfe ON public.notas_fiscais;

CREATE TRIGGER trg_sync_remessa_status_nfe
AFTER UPDATE OF status ON public.notas_fiscais
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_remessa_status_nfe();