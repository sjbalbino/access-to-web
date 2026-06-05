-- Função para buscar e definir a conta DRE baseada no sub-centro de custo
CREATE OR REPLACE FUNCTION public.fn_sync_dre_conta_from_sub_centro_custo()
RETURNS TRIGGER AS $$
DECLARE
    v_codigo_dre TEXT;
    v_dre_conta_id UUID;
BEGIN
    -- Busca o código DRE configurado no sub-centro de custo
    SELECT codigo_dre INTO v_codigo_dre
    FROM public.sub_centros_custo
    WHERE id = NEW.sub_centro_custo_id;

    -- Se encontrou um código, tenta localizar o ID correspondente na dre_contas
    IF v_codigo_dre IS NOT NULL THEN
        SELECT id INTO v_dre_conta_id
        FROM public.dre_contas
        WHERE codigo = v_codigo_dre
        AND tenant_id = NEW.tenant_id
        LIMIT 1;

        -- Atribui o ID encontrado ao novo registro
        IF v_dre_conta_id IS NOT NULL THEN
            NEW.dre_conta_id := v_dre_conta_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para Contas a Pagar
DROP TRIGGER IF EXISTS tr_sync_dre_conta_pagar ON public.contas_pagar;
CREATE TRIGGER tr_sync_dre_conta_pagar
BEFORE INSERT OR UPDATE OF sub_centro_custo_id ON public.contas_pagar
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_dre_conta_from_sub_centro_custo();

-- Trigger para Contas a Receber
DROP TRIGGER IF EXISTS tr_sync_dre_conta_receber ON public.contas_receber;
CREATE TRIGGER tr_sync_dre_conta_receber
BEFORE INSERT OR UPDATE OF sub_centro_custo_id ON public.contas_receber
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_dre_conta_from_sub_centro_custo();

-- Script de atualização para registros existentes sem conta DRE
UPDATE public.contas_pagar cp
SET dre_conta_id = dc.id
FROM public.sub_centros_custo scc, public.dre_contas dc
WHERE cp.sub_centro_custo_id = scc.id
  AND scc.codigo_dre = dc.codigo
  AND cp.tenant_id = dc.tenant_id
  AND cp.dre_conta_id IS NULL
  AND scc.codigo_dre IS NOT NULL;

UPDATE public.contas_receber cr
SET dre_conta_id = dc.id
FROM public.sub_centros_custo scc, public.dre_contas dc
WHERE cr.sub_centro_custo_id = scc.id
  AND scc.codigo_dre = dc.codigo
  AND cr.tenant_id = dc.tenant_id
  AND cr.dre_conta_id IS NULL
  AND scc.codigo_dre IS NOT NULL;
