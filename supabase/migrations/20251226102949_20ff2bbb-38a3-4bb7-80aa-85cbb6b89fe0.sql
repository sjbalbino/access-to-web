
-- Adicionar campo local_entrega_id na tabela devolucoes_deposito
ALTER TABLE public.devolucoes_deposito
ADD COLUMN local_entrega_id uuid REFERENCES public.locais_entrega(id);

-- Criar índice para melhorar performance
CREATE INDEX idx_devolucoes_local_entrega ON public.devolucoes_deposito(local_entrega_id);

-- Comentário na coluna
COMMENT ON COLUMN public.devolucoes_deposito.local_entrega_id IS 'Local de entrega da devolução';
