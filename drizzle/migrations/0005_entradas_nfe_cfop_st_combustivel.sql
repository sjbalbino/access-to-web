CREATE OR REPLACE FUNCTION public.fn_entrada_nfe_cfop_cabecalho(_entrada uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cod text; alt text; cid uuid;
BEGIN
  SELECT CASE left(c,1) WHEN '5' THEN '1' WHEN '6' THEN '2' WHEN '7' THEN '3' ELSE left(c,1) END || substr(c,2)
    INTO cod FROM (SELECT left(regexp_replace(coalesce(cfop,''),'\D','','g'),4) c FROM entradas_nfe_itens WHERE entrada_nfe_id=_entrada) x
   WHERE length(c)=4 GROUP BY c ORDER BY count(*) DESC LIMIT 1;
  IF cod IS NULL THEN RETURN; END IF;
  SELECT id INTO cid FROM cfops WHERE codigo=cod AND tipo='entrada' LIMIT 1;
  IF cid IS NULL THEN
    alt := CASE substr(cod,2) WHEN '405' THEN left(cod,1)||'403' WHEN '404' THEN left(cod,1)||'403'
                              WHEN '656' THEN left(cod,1)||'653' WHEN '655' THEN left(cod,1)||'652' END;
    IF alt IS NOT NULL THEN SELECT id INTO cid FROM cfops WHERE codigo=alt AND tipo='entrada' LIMIT 1; END IF;
  END IF;
  IF cid IS NULL THEN RETURN; END IF;
  UPDATE entradas_nfe SET cfop_id=cid WHERE id=_entrada AND cfop_id IS NULL AND status<>'finalizado';
END $$;
SELECT public.fn_entrada_nfe_cfop_cabecalho(id) FROM public.entradas_nfe WHERE cfop_id IS NULL AND status<>'finalizado';