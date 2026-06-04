CREATE OR REPLACE FUNCTION public.recalcular_rateios_granja(
    p_granja_id UUID,
    p_data_inicio DATE,
    p_data_fim DATE,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
    v_socio RECORD;
    v_item RECORD;
    v_count_lanc INTEGER := 0;
    v_count_cp INTEGER := 0;
    v_count_cr INTEGER := 0;
    v_count_cp_baixa INTEGER := 0;
    v_count_cr_baixa INTEGER := 0;
    v_valor_total NUMERIC;
    v_valor_rateio NUMERIC;
BEGIN
    -- 1. Criar log
    INSERT INTO public.rateio_recalculo_logs (user_id, granja_id, data_inicial, data_final, status)
    VALUES (p_user_id, p_granja_id, p_data_inicio, p_data_fim, 'processando')
    RETURNING id INTO v_log_id;

    -- 2. Limpar rateios existentes no período para esta granja
    -- Precisamos identificar quais registros pertencem a esta granja
    
    -- Lançamentos Financeiros
    DELETE FROM public.lancamento_rateio_socios
    WHERE origem_tipo = 'lancamento'
      AND origem_id IN (
          SELECT id FROM public.lancamentos_financeiros 
          WHERE granja_id = p_granja_id 
            AND data_lancamento >= p_data_inicio 
            AND data_lancamento <= p_data_fim
      );

    -- CP Baixas
    DELETE FROM public.lancamento_rateio_socios
    WHERE origem_tipo = 'cp_baixa'
      AND origem_id IN (
          SELECT b.id FROM public.contas_pagar_baixas b
          JOIN public.contas_pagar c ON b.conta_id = c.id
          WHERE c.granja_id = p_granja_id 
            AND b.data_pagamento >= p_data_inicio 
            AND b.data_pagamento <= p_data_fim
      );

    -- CR Baixas
    DELETE FROM public.lancamento_rateio_socios
    WHERE origem_tipo = 'cr_baixa'
      AND origem_id IN (
          SELECT b.id FROM public.contas_receber_baixas b
          JOIN public.contas_receber c ON b.conta_id = c.id
          WHERE c.granja_id = p_granja_id 
            AND b.data_pagamento >= p_data_inicio 
            AND b.data_pagamento <= p_data_fim
      );

    -- 3. Re-inserir rateios baseados nos produtores atuais da granja
    FOR v_socio IN (SELECT id, percentual_participacao FROM public.produtores WHERE granja_id = p_granja_id AND tipo_produtor = 'socio' AND ativo = true) LOOP
        
        -- Lançamentos
        FOR v_item IN (SELECT id, valor FROM public.lancamentos_financeiros WHERE granja_id = p_granja_id AND data_lancamento >= p_data_inicio AND data_lancamento <= p_data_fim) LOOP
            v_valor_rateio := (v_item.valor * v_socio.percentual_participacao) / 100;
            INSERT INTO public.lancamento_rateio_socios (origem_tipo, origem_id, socio_produtor_id, percentual, valor)
            VALUES ('lancamento', v_item.id, v_socio.id, v_socio.percentual_participacao, v_valor_rateio);
            IF v_socio.id = (SELECT id FROM public.produtores WHERE granja_id = p_granja_id AND tipo_produtor = 'socio' AND ativo = true LIMIT 1) THEN
                v_count_lanc := v_count_lanc + 1;
            END IF;
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
            IF v_socio.id = (SELECT id FROM public.produtores WHERE granja_id = p_granja_id AND tipo_produtor = 'socio' AND ativo = true LIMIT 1) THEN
                v_count_cp_baixa := v_count_cp_baixa + 1;
            END IF;
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
            IF v_socio.id = (SELECT id FROM public.produtores WHERE granja_id = p_granja_id AND tipo_produtor = 'socio' AND ativo = true LIMIT 1) THEN
                v_count_cr_baixa := v_count_cr_baixa + 1;
            END IF;
        END LOOP;

    END LOOP;

    -- 4. Atualizar log
    UPDATE public.rateio_recalculo_logs 
    SET status = 'concluido', 
        observacoes = format('Recalculados: %s lançamentos, %s baixas CP, %s baixas CR.', v_count_lanc, v_count_cp_baixa, v_count_cr_baixa)
    WHERE id = v_log_id;

    RETURN jsonb_build_object(
        'status', 'success',
        'log_id', v_log_id,
        'lancamentos', v_count_lanc,
        'cp_baixas', v_count_cp_baixa,
        'cr_baixas', v_count_cr_baixa
    );
EXCEPTION WHEN OTHERS THEN
    IF v_log_id IS NOT NULL THEN
        UPDATE public.rateio_recalculo_logs SET status = 'erro', observacoes = SQLERRM WHERE id = v_log_id;
    END IF;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalcular_rateios_granja(UUID, DATE, DATE, UUID) TO authenticated;
