
ALTER TABLE public.notas_deposito_emitidas
ADD COLUMN status character varying DEFAULT 'rascunho';

-- Atualizar notas existentes que já têm nota fiscal vinculada
UPDATE public.notas_deposito_emitidas nde
SET status = nf.status
FROM public.notas_fiscais nf
WHERE nde.nota_fiscal_id = nf.id AND nf.status IS NOT NULL;
