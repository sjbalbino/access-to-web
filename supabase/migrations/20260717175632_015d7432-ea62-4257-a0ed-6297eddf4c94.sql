
ALTER TABLE public.notas_fiscais
  ADD COLUMN IF NOT EXISTS cancelado_por uuid,
  ADD COLUMN IF NOT EXISTS cancelado_por_nome text,
  ADD COLUMN IF NOT EXISTS cancelado_em timestamptz,
  ADD COLUMN IF NOT EXISTS cancelado_motivo text;

UPDATE public.notas_fiscais
   SET cancelado_em = COALESCE(cancelado_em, updated_at),
       cancelado_motivo = COALESCE(cancelado_motivo, motivo_status)
 WHERE status IN ('cancelado','cancelada')
   AND (cancelado_em IS NULL OR cancelado_motivo IS NULL);
