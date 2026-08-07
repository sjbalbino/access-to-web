ALTER TABLE public.notas_deposito_emitidas
  ADD COLUMN IF NOT EXISTS local_entrega_id uuid REFERENCES public.locais_entrega(id);

CREATE INDEX IF NOT EXISTS idx_notas_deposito_emitidas_local_entrega
  ON public.notas_deposito_emitidas (local_entrega_id);