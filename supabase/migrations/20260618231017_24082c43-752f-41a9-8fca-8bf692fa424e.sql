
DROP POLICY IF EXISTS "Users can manage their own bank statements" ON public.extratos_bancarios;

CREATE POLICY tenant_select_extratos_bancarios ON public.extratos_bancarios
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contas_bancarias cb
    WHERE cb.id = extratos_bancarios.conta_bancaria_id
      AND public.granja_belongs_to_tenant(cb.granja_id)
  )
);

CREATE POLICY tenant_insert_extratos_bancarios ON public.extratos_bancarios
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contas_bancarias cb
    WHERE cb.id = extratos_bancarios.conta_bancaria_id
      AND public.granja_belongs_to_tenant(cb.granja_id)
  )
);

CREATE POLICY tenant_update_extratos_bancarios ON public.extratos_bancarios
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contas_bancarias cb
    WHERE cb.id = extratos_bancarios.conta_bancaria_id
      AND public.granja_belongs_to_tenant(cb.granja_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contas_bancarias cb
    WHERE cb.id = extratos_bancarios.conta_bancaria_id
      AND public.granja_belongs_to_tenant(cb.granja_id)
  )
);

CREATE POLICY tenant_delete_extratos_bancarios ON public.extratos_bancarios
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contas_bancarias cb
    WHERE cb.id = extratos_bancarios.conta_bancaria_id
      AND public.granja_belongs_to_tenant(cb.granja_id)
  )
);

DROP POLICY IF EXISTS "Users can view logs" ON public.rateio_recalculo_logs;
CREATE POLICY tenant_select_rateio_recalculo_logs ON public.rateio_recalculo_logs
FOR SELECT TO authenticated
USING (
  public.granja_belongs_to_tenant(granja_id)
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS tenant_select_controle_lavouras ON public.controle_lavouras;
DROP POLICY IF EXISTS tenant_insert_controle_lavouras ON public.controle_lavouras;
DROP POLICY IF EXISTS tenant_update_controle_lavouras ON public.controle_lavouras;
DROP POLICY IF EXISTS tenant_delete_controle_lavouras ON public.controle_lavouras;

CREATE POLICY tenant_select_controle_lavouras ON public.controle_lavouras
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_user_tenant_id()
  OR (public.is_super_admin(auth.uid()) AND public.get_user_tenant_id() IS NULL)
);

CREATE POLICY tenant_insert_controle_lavouras ON public.controle_lavouras
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant_id()
  OR (public.is_super_admin(auth.uid()) AND public.get_user_tenant_id() IS NULL)
);

CREATE POLICY tenant_update_controle_lavouras ON public.controle_lavouras
FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_user_tenant_id()
  OR (public.is_super_admin(auth.uid()) AND public.get_user_tenant_id() IS NULL)
);

CREATE POLICY tenant_delete_controle_lavouras ON public.controle_lavouras
FOR DELETE TO authenticated
USING (
  tenant_id = public.get_user_tenant_id()
  OR (public.is_super_admin(auth.uid()) AND public.get_user_tenant_id() IS NULL)
);

DROP POLICY IF EXISTS tenant_select_lavouras ON public.lavouras;
CREATE POLICY tenant_select_lavouras ON public.lavouras
FOR SELECT TO authenticated
USING (
  tenant_id = public.get_user_tenant_id()
  OR (public.is_super_admin(auth.uid()) AND public.get_user_tenant_id() IS NULL)
);

CREATE OR REPLACE FUNCTION public.granja_belongs_to_tenant(_granja_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    CASE
      WHEN _granja_id IS NULL THEN
        (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)
      ELSE EXISTS (
        SELECT 1 FROM public.granjas
        WHERE id = _granja_id
          AND tenant_id = get_user_tenant_id()
      )
      OR (is_super_admin(auth.uid()) AND get_user_tenant_id() IS NULL)
    END
$function$;

CREATE OR REPLACE FUNCTION public.handle_principal_granja()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_principal = true THEN
    UPDATE public.granjas
       SET is_principal = false
     WHERE tenant_id = NEW.tenant_id
       AND id <> NEW.id
       AND is_principal = true;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_sync_dre_conta_from_sub_centro_custo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_codigo_dre TEXT;
    v_dre_conta_id UUID;
BEGIN
    SELECT codigo_dre INTO v_codigo_dre
    FROM public.sub_centros_custo
    WHERE id = NEW.sub_centro_custo_id;

    IF v_codigo_dre IS NOT NULL THEN
        SELECT id INTO v_dre_conta_id
        FROM public.dre_contas
        WHERE codigo = v_codigo_dre
        AND tenant_id = NEW.tenant_id
        LIMIT 1;

        IF v_dre_conta_id IS NOT NULL THEN
            NEW.dre_conta_id := v_dre_conta_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

ALTER FUNCTION public.recalcular_rateios_granja(uuid, date, date, uuid) SET search_path TO 'public';
ALTER FUNCTION public.desfazer_recalculo_rateio(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path TO 'public', 'pgmq';
ALTER FUNCTION public.delete_email(text, bigint) SET search_path TO 'public', 'pgmq';
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path TO 'public', 'pgmq';
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path TO 'public', 'pgmq';
