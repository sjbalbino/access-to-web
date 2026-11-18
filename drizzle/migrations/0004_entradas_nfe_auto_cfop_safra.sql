CREATE OR REPLACE FUNCTION public.fn_entrada_nfe_safra_principal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.safra_id IS NULL AND NEW.granja_id IS NOT NULL THEN
    SELECT s.id INTO NEW.safra_id FROM safras s JOIN granjas g ON g.tenant_id=s.tenant_id
     WHERE g.id=NEW.granja_id AND s.is_principal LIMIT 1;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_entrada_nfe_safra_principal ON public.entradas_nfe;
CREATE TRIGGER trg_entrada_nfe_safra_principal BEFORE INSERT ON public.entradas_nfe
FOR EACH ROW EXECUTE FUNCTION public.fn_entrada_nfe_safra_principal();

CREATE OR REPLACE FUNCTION public.fn_entrada_nfe_cfop_cabecalho(_entrada uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cod text;
BEGIN
  SELECT CASE left(c,1) WHEN '5' THEN '1' WHEN '6' THEN '2' WHEN '7' THEN '3' ELSE left(c,1) END || substr(c,2)
    INTO cod FROM (SELECT left(regexp_replace(coalesce(cfop,''),'\D','','g'),4) c FROM entradas_nfe_itens WHERE entrada_nfe_id=_entrada) x
   WHERE length(c)=4 GROUP BY c ORDER BY count(*) DESC LIMIT 1;
  IF cod IS NULL THEN RETURN; END IF;
  UPDATE entradas_nfe SET cfop_id=(SELECT id FROM cfops WHERE codigo=cod AND tipo='entrada' LIMIT 1)
   WHERE id=_entrada AND cfop_id IS NULL AND status<>'finalizado';
END $$;

CREATE OR REPLACE FUNCTION public.fn_entrada_nfe_item_cfop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.fn_entrada_nfe_cfop_cabecalho(NEW.entrada_nfe_id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_entrada_nfe_item_cfop ON public.entradas_nfe_itens;
CREATE TRIGGER trg_entrada_nfe_item_cfop AFTER INSERT ON public.entradas_nfe_itens
FOR EACH ROW EXECUTE FUNCTION public.fn_entrada_nfe_item_cfop();

UPDATE public.entradas_nfe e SET safra_id=(SELECT s.id FROM safras s JOIN granjas g ON g.tenant_id=s.tenant_id WHERE g.id=e.granja_id AND s.is_principal LIMIT 1)
 WHERE e.safra_id IS NULL AND e.status<>'finalizado';
SELECT public.fn_entrada_nfe_cfop_cabecalho(id) FROM public.entradas_nfe WHERE cfop_id IS NULL AND status<>'finalizado';