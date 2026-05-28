-- Remover restrição UNIQUE em granja_id (vamos permitir múltiplos emitentes por granja)
ALTER TABLE public.emitentes_nfe DROP CONSTRAINT IF EXISTS emitentes_nfe_granja_id_key;

-- Adicionar coluna inscricao_produtor_id
ALTER TABLE public.emitentes_nfe
  ADD COLUMN IF NOT EXISTS inscricao_produtor_id uuid REFERENCES public.inscricoes_produtor(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS emitentes_nfe_inscricao_produtor_id_key 
  ON public.emitentes_nfe(inscricao_produtor_id) 
  WHERE inscricao_produtor_id IS NOT NULL;

-- Migração de dados: clonar emitente para cada inscrição vinculada
DO $$
DECLARE
  v_insc RECORD;
  v_old_emit RECORD;
  v_new_emit_id uuid;
  v_old_cred RECORD;
BEGIN
  FOR v_insc IN 
    SELECT ip.id AS inscricao_id, ip.emitente_id, ip.granja_id
    FROM public.inscricoes_produtor ip
    WHERE ip.emitente_id IS NOT NULL
  LOOP
    IF EXISTS (SELECT 1 FROM public.emitentes_nfe WHERE inscricao_produtor_id = v_insc.inscricao_id) THEN
      CONTINUE;
    END IF;
    
    SELECT * INTO v_old_emit FROM public.emitentes_nfe WHERE id = v_insc.emitente_id;
    IF NOT FOUND THEN CONTINUE; END IF;
    
    INSERT INTO public.emitentes_nfe (
      inscricao_produtor_id, granja_id, ambiente, serie_nfe, numero_atual_nfe,
      serie_nfce, numero_atual_nfce, crt,
      aliq_icms_padrao, aliq_pis_padrao, aliq_cofins_padrao,
      aliq_ibs_padrao, aliq_cbs_padrao, aliq_is_padrao,
      api_provider, api_configurada, certificado_nome, certificado_validade, ativo,
      cst_icms_padrao, cst_pis_padrao, cst_cofins_padrao, cst_ipi_padrao,
      cst_ibs_padrao, cst_cbs_padrao, cst_is_padrao
    )
    VALUES (
      v_insc.inscricao_id, v_old_emit.granja_id, v_old_emit.ambiente, v_old_emit.serie_nfe, v_old_emit.numero_atual_nfe,
      v_old_emit.serie_nfce, v_old_emit.numero_atual_nfce, v_old_emit.crt,
      v_old_emit.aliq_icms_padrao, v_old_emit.aliq_pis_padrao, v_old_emit.aliq_cofins_padrao,
      v_old_emit.aliq_ibs_padrao, v_old_emit.aliq_cbs_padrao, v_old_emit.aliq_is_padrao,
      v_old_emit.api_provider, v_old_emit.api_configurada, v_old_emit.certificado_nome, v_old_emit.certificado_validade, v_old_emit.ativo,
      v_old_emit.cst_icms_padrao, v_old_emit.cst_pis_padrao, v_old_emit.cst_cofins_padrao, v_old_emit.cst_ipi_padrao,
      v_old_emit.cst_ibs_padrao, v_old_emit.cst_cbs_padrao, v_old_emit.cst_is_padrao
    )
    RETURNING id INTO v_new_emit_id;
    
    SELECT * INTO v_old_cred FROM public.emitentes_nfe_credentials WHERE emitente_id = v_old_emit.id LIMIT 1;
    IF FOUND THEN
      INSERT INTO public.emitentes_nfe_credentials (
        emitente_id, granja_id, tenant_id,
        api_consumer_key, api_consumer_secret, api_access_token, api_access_token_secret
      )
      VALUES (
        v_new_emit_id, v_old_cred.granja_id, v_old_cred.tenant_id,
        v_old_cred.api_consumer_key, v_old_cred.api_consumer_secret,
        v_old_cred.api_access_token, v_old_cred.api_access_token_secret
      );
    END IF;
    
    UPDATE public.inscricoes_produtor SET emitente_id = v_new_emit_id WHERE id = v_insc.inscricao_id;
  END LOOP;
END $$;