DO $$
DECLARE
    r RECORD;
    v_conta_bancaria_id UUID := '42799b97-a924-46a5-8aa1-2da22607f5c6';
    v_conta_bancaria_nome TEXT := 'BRASIL';
BEGIN
    FOR r IN 
        SELECT id, data_vencimento, valor_original, tenant_id 
        FROM public.contas_pagar 
        WHERE status ILIKE 'aberto' AND data_vencimento <= '2025-12-31'
    LOOP
        -- Inserir o registro de baixa
        INSERT INTO public.contas_pagar_baixas (
            conta_id,
            data_pagamento,
            valor_pago,
            juros,
            multa,
            desconto,
            conta_bancaria_id,
            conta_bancaria,
            forma_pagamento,
            observacoes
        ) VALUES (
            r.id,
            r.data_vencimento,
            r.valor_original,
            0,
            0,
            0,
            v_conta_bancaria_id,
            v_conta_bancaria_nome,
            'pix',
            'Baixa em lote via automação (vencimento até 31/12/2025)'
        );

        -- Atualizar o status da conta
        UPDATE public.contas_pagar 
        SET status = 'pago', 
            valor_pago = r.valor_original,
            updated_at = now()
        WHERE id = r.id;
    END LOOP;
END $$;