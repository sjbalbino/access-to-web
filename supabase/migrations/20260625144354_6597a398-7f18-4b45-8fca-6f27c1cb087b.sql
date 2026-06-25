
-- Backfill tenant_id em notas_fiscais a partir da granja
UPDATE public.notas_fiscais nf
SET tenant_id = g.tenant_id
FROM public.granjas g
WHERE nf.granja_id = g.id AND nf.tenant_id IS NULL;

-- Trigger para preencher automaticamente em novos inserts/updates
CREATE OR REPLACE FUNCTION public.set_nota_fiscal_tenant_from_granja()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.granja_id IS NOT NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.granjas WHERE id = NEW.granja_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_nota_fiscal_tenant ON public.notas_fiscais;
CREATE TRIGGER trg_set_nota_fiscal_tenant
BEFORE INSERT OR UPDATE ON public.notas_fiscais
FOR EACH ROW EXECUTE FUNCTION public.set_nota_fiscal_tenant_from_granja();
