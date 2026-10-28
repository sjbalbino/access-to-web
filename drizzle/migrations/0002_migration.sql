ALTER TABLE public.remessas_venda ADD COLUMN IF NOT EXISTS nota_fiscal_tentativa_id uuid;
CREATE INDEX IF NOT EXISTS idx_remessas_venda_nf_tentativa ON public.remessas_venda(nota_fiscal_tentativa_id);

CREATE OR REPLACE FUNCTION public.trg_sync_remessa_status_nfe()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF lower(NEW.status) IN ('autorizado', 'autorizada') THEN
      -- Reconciliação: remessa cujo vínculo foi desfeito por falso timeout
      UPDATE public.remessas_venda
         SET nota_fiscal_id = NEW.id,
             status = 'carregado_nfe',
             updated_at = now()
       WHERE nota_fiscal_tentativa_id = NEW.id
         AND nota_fiscal_id IS NULL
         AND status = 'carregado';

      UPDATE public.remessas_venda
         SET status = 'carregado_nfe',
             updated_at = now()
       WHERE nota_fiscal_id = NEW.id
         AND status <> 'carregado_nfe';
    ELSIF lower(NEW.status) IN ('cancelado', 'cancelada', 'inutilizado', 'inutilizada') THEN
      UPDATE public.remessas_venda
         SET status = 'cancelada',
             updated_at = now()
       WHERE nota_fiscal_id = NEW.id
         AND status <> 'cancelada';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

UPDATE public.remessas_venda SET nota_fiscal_tentativa_id = nota_fiscal_id WHERE nota_fiscal_id IS NOT NULL AND nota_fiscal_tentativa_id IS NULL;