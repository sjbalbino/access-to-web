ALTER TABLE public.compras_cereais ADD COLUMN IF NOT EXISTS importado boolean NOT NULL DEFAULT false;
UPDATE public.compras_cereais SET importado = true WHERE created_at::date = '2026-07-05';