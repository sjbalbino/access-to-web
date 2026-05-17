
DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'produtos','grupos_produtos','placas','transportadoras','locais_entrega','safras',
    'lavouras','silos','controle_lavouras',
    'plantios','aplicacoes','chuvas','floracoes','insetos','plantas_invasoras','analises_solo','pivos',
    'dre_contas','tabela_umidades','plano_contas_gerencial'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id()', v_table);
  END LOOP;
END $$;
