
ALTER TABLE public.transferencias_deposito ADD COLUMN IF NOT EXISTS importado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notas_deposito_emitidas ADD COLUMN IF NOT EXISTS importado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.devolucoes_deposito ADD COLUMN IF NOT EXISTS importado BOOLEAN NOT NULL DEFAULT false;

UPDATE public.transferencias_deposito SET importado = true WHERE created_at::date = '2026-07-05';
UPDATE public.notas_deposito_emitidas SET importado = true WHERE created_at::date = '2026-07-05';
UPDATE public.devolucoes_deposito SET importado = true WHERE created_at::date = '2026-07-05';
