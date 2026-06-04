-- Add backup_data column to store the state before recalculation
ALTER TABLE public.rateio_recalculo_logs ADD COLUMN IF NOT EXISTS backup_data JSONB;

-- Update the recalculation function to save backup data
CREATE OR REPLACE FUNCTION public.recalcular_rateios_granja(
    p_granja_id uuid,
    p_data_inicio date,
    p_data_fim date,
    p_user_id uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 DECLARE
     v_log_id UUID;
     v_socio RECORD;
     v_item RECORD;
     v_count_lanc INTEGER := 0;
     v_count_cp_baixa INTEGER := 0;
     v_count_cr_baixa INTEGER := 0;
     v_valor_rateio NUMERIC;
     v_backup_data JSONB;
 BEGIN
     -- 1. Capturar dados atuais para backup antes de deletar
     SELECT jsonb_agg(sub) INTO v_backup_data
     FROM (
         SELECT * FROM public.lancamento_rateio_socios
         WHERE (origem_tipo = 'lancamento' AND origem_id IN (SELECT id FROM public.lancamentos_financeiros WHERE granja_id = p_granja_id AND data_lancamento >= p_data_inicio AND data_lancamento <= p_data_fim))
            OR (origem_tipo = 'cp_baixa' AND origem_id IN (SELECT b.id FROM public.contas_pagar_baixas b JOIN public.contas_pagar c ON b.conta_id = c.id WHERE c.granja_id = p_granja_id AND b.data_pagamento >= p_data_inicio AND b.data_pagamento <= p_data_fim))
            OR (origem_tipo = 'cr_baixa' AND origem_id IN (SELECT b.id FROM public.contas_receber_baixas b JOIN public.contas_receber c ON b.conta_id = c.id WHERE c.granja_id = p_granja_id AND b.data_pagamento >= p_data_inicio AND b.data_pagamento <= p_data_fim))
     ) sub;

     -- 2. Criar log com backup
     INSERT INTO public.rateio_recalculo_logs (user_id, granja_id, data_inicial, data_final, status, backup_data)
     VALUES (p_user_id, p_granja_id, p_data_inicio, p_data_fim, 'processando', v_backup_data)
     RETURNING id INTO v_log_id;

     -- 3. Limpar rateios existentes no período para esta granja
     DELETE FROM public.lancamento_rateio_socios
     WHERE (origem_tipo = 'lancamento' AND origem_id IN (SELECT id FROM public.lancamentos_financeiros WHERE granja_id = p_granja_id AND data_lancamento >= p_data_inicio AND data_lancamento <= p_data_fim))
        OR (origem_tipo = 'cp_baixa' AND origem_id IN (SELECT b.id FROM public.contas_pagar_baixas b JOIN public.contas_pagar c ON b.conta_id = c.id WHERE c.granja_id = p_granja_id AND b.data_pagamento >= p_data_inicio AND b.data_pagamento <= p_data_fim))
        OR (origem_tipo = 'cr_baixa' AND origem_id IN (SELECT b.id FROM public.contas_receber_baixas b JOIN public.contas_receber c ON b.conta_id = c.id WHERE c.granja_id = p_granja_id AND b.data_pagamento >= p_data_inicio AND b.data_pagamento <= p_data_fim));

     -- 4. Re-inserir rateios baseados nos produtores atuais da granja
     FOR v_socio IN (SELECT id, percentual_participacao FROM public.produtores WHERE granja_id = p_granja_id AND tipo_produtor = 'socio' AND ativo = true) LOOP
         
         -- Lançamentos
         FOR v_item IN (SELECT id, valor FROM public.lancamentos_financeiros WHERE granja_id = p_granja_id AND data_lancamento >= p_data_inicio AND data_lancamento <= p_data_fim) LOOP
             v_valor_rateio := (v_item.valor * v_socio.percentual_participacao) / 100;
             INSERT INTO public.lancamento_rateio_socios (origem_tipo, origem_id, socio_produtor_id, percentual, valor)
             VALUES ('lancamento', v_item.id, v_socio.id, v_socio.percentual_participacao, v_valor_rateio);
         END LOOP;

         -- CP Baixas
         FOR v_item IN (
             SELECT b.id, (b.valor_pago + b.juros + b.multa - b.desconto) as valor_final
             FROM public.contas_pagar_baixas b
             JOIN public.contas_pagar c ON b.conta_id = c.id
             WHERE c.granja_id = p_granja_id AND b.data_pagamento >= p_data_inicio AND b.data_pagamento <= p_data_fim
         ) LOOP
             v_valor_rateio := (v_item.valor_final * v_socio.percentual_participacao) / 100;
             INSERT INTO public.lancamento_rateio_socios (origem_tipo, origem_id, socio_produtor_id, percentual, valor)
             VALUES ('cp_baixa', v_item.id, v_socio.id, v_socio.percentual_participacao, v_valor_rateio);
         END LOOP;

         -- CR Baixas
         FOR v_item IN (
             SELECT b.id, (b.valor_pago + b.juros + b.multa - b.desconto) as valor_final
             FROM public.contas_receber_baixas b
             JOIN public.contas_receber c ON b.conta_id = c.id
             WHERE c.granja_id = p_granja_id AND b.data_pagamento >= p_data_inicio AND b.data_pagamento <= p_data_fim
         ) LOOP
             v_valor_rateio := (v_item.valor_final * v_socio.percentual_participacao) / 100;
             INSERT INTO public.lancamento_rateio_socios (origem_tipo, origem_id, socio_produtor_id, percentual, valor)
             VALUES ('cr_baixa', v_item.id, v_socio.id, v_socio.percentual_participacao, v_valor_rateio);
         END LOOP;
     END LOOP;

     -- 5. Atualizar status do log
     UPDATE public.rateio_recalculo_logs 
     SET status = 'concluido', 
         observacoes = 'Recálculo processado com sucesso.'
     WHERE id = v_log_id;

     RETURN jsonb_build_object(
         'status', 'success',
         'log_id', v_log_id
     );
 END;
 $function$;

-- Create the Undo function
CREATE OR REPLACE FUNCTION public.desfazer_recalculo_rateio(
    p_log_id uuid,
    p_user_id uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 DECLARE
     v_log RECORD;
     v_item JSONB;
 BEGIN
     -- 1. Buscar o log
     SELECT * INTO v_log FROM public.rateio_recalculo_logs WHERE id = p_log_id;
     
     IF NOT FOUND THEN
         RETURN jsonb_build_object('status', 'error', 'message', 'Log não encontrado.');
     END IF;

     IF v_log.status = 'desfeito' THEN
         RETURN jsonb_build_object('status', 'error', 'message', 'Este recálculo já foi desfeito.');
     END IF;

     IF v_log.backup_data IS NULL THEN
         RETURN jsonb_build_object('status', 'error', 'message', 'Não há dados de backup para este log.');
     END IF;

     -- 2. Limpar os rateios atuais no período daquela granja (limpeza total para evitar duplicatas ou lixo)
     DELETE FROM public.lancamento_rateio_socios
     WHERE (origem_tipo = 'lancamento' AND origem_id IN (SELECT id FROM public.lancamentos_financeiros WHERE granja_id = v_log.granja_id AND data_lancamento >= v_log.data_inicial AND data_lancamento <= v_log.data_final))
        OR (origem_tipo = 'cp_baixa' AND origem_id IN (SELECT b.id FROM public.contas_pagar_baixas b JOIN public.contas_pagar c ON b.conta_id = c.id WHERE c.granja_id = v_log.granja_id AND b.data_pagamento >= v_log.data_inicial AND b.data_pagamento <= v_log.data_final))
        OR (origem_tipo = 'cr_baixa' AND origem_id IN (SELECT b.id FROM public.contas_receber_baixas b JOIN public.contas_receber c ON b.conta_id = c.id WHERE c.granja_id = v_log.granja_id AND b.data_pagamento >= v_log.data_inicial AND b.data_pagamento <= v_log.data_final));

     -- 3. Restaurar do backup_data
     FOR v_item IN SELECT * FROM jsonb_array_elements(v_log.backup_data) LOOP
         INSERT INTO public.lancamento_rateio_socios (
             origem_tipo, 
             origem_id, 
             socio_produtor_id, 
             percentual, 
             valor,
             created_at
         ) VALUES (
             (v_item->>'origem_tipo')::text,
             (v_item->>'origem_id')::uuid,
             (v_item->>'socio_produtor_id')::uuid,
             (v_item->>'percentual')::numeric,
             (v_item->>'valor')::numeric,
             COALESCE((v_item->>'created_at')::timestamptz, now())
         );
     END LOOP;

     -- 4. Marcar log como desfeito
     UPDATE public.rateio_recalculo_logs 
     SET status = 'desfeito', 
         observacoes = 'Recálculo desfeito pelo usuário em ' || now()::text
     WHERE id = p_log_id;

     -- 5. Registrar ação de desfazer no log (opcional, mas bom para auditoria)
     INSERT INTO public.rateio_recalculo_logs (user_id, granja_id, data_inicial, data_final, status, observacoes)
     VALUES (p_user_id, v_log.granja_id, v_log.data_inicial, v_log.data_final, 'desfazer_concluido', 'Desfêz o log ID: ' || p_log_id);

     RETURN jsonb_build_object('status', 'success');
 END;
 $function$;