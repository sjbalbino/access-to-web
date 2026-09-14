CREATE OR REPLACE FUNCTION public.trg_sync_remessa_status_nfe()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
         SET status = 'cancelada',
             updated_at = now()
       WHERE nota_fiscal_id = NEW.id
         AND status <> 'cancelada';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

UPDATE public.remessas_venda r
   SET status = 'cancelada',
       updated_at = now()
  FROM public.notas_fiscais nf
 WHERE r.nota_fiscal_id = nf.id
   AND lower(nf.status) IN ('cancelado','cancelada','inutilizado','inutilizada')
   AND r.status <> 'cancelada';