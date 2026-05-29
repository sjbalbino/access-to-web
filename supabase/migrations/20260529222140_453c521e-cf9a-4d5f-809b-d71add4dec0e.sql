
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('cst_ibs','cst_cbs','cst_is','cst_ibs_padrao','cst_cbs_padrao','cst_is_padrao')
      AND data_type = 'character varying'
      AND character_maximum_length IS NOT NULL
      AND character_maximum_length < 3
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I TYPE varchar(3)',
                   r.table_schema, r.table_name, r.column_name);
  END LOOP;
END $$;
