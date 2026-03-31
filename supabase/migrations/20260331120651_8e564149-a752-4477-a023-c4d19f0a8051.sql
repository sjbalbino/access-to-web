ALTER TABLE public.colheitas
  ADD COLUMN IF NOT EXISTS hora_entrada varchar,
  ADD COLUMN IF NOT EXISTS hora_saida varchar,
  ADD COLUMN IF NOT EXISTS percentual_quebra numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balanceiro varchar,
  ADD COLUMN IF NOT EXISTS romaneio integer,
  ADD COLUMN IF NOT EXISTS valor_unitario numeric DEFAULT 0;