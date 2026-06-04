ALTER TABLE public.grupos_produtos ADD COLUMN IF NOT EXISTS codigo_dre TEXT;
COMMENT ON COLUMN public.grupos_produtos.codigo_dre IS 'Código da conta DRE vinculada a este grupo de produtos para rateio automático.';
