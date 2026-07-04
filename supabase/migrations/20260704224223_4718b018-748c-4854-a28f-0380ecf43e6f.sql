
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'colheitas','compras_cereais','compras_cereais_notas_referenciadas',
    'configuracoes_balanca','contas_pagar','contas_pagar_baixas',
    'contas_receber','contas_receber_baixas','devolucoes_deposito',
    'emitentes_nfe','emitentes_nfe_credentials','entradas_nfe','entradas_nfe_itens',
    'estoque_produtos','extratos_bancarios','granjas','inscricoes_produtor',
    'lancamentos_financeiros','notas_deposito_emitidas','notas_fiscais',
    'notas_fiscais_duplicatas','notas_fiscais_itens','notas_fiscais_referenciadas',
    'produtores','transferencias_deposito'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS super_admin_select_all ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY super_admin_select_all ON public.%I FOR SELECT TO authenticated USING (is_super_admin(auth.uid()))',
      t
    );
  END LOOP;
END $$;
