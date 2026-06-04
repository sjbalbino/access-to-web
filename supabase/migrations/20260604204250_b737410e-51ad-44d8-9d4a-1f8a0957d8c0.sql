ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS produto_id UUID REFERENCES public.produtos(id);
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS produto_id UUID REFERENCES public.produtos(id);
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS produto_id UUID REFERENCES public.produtos(id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos_financeiros TO authenticated;
GRANT ALL ON public.lancamentos_financeiros TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_pagar TO authenticated;
GRANT ALL ON public.contas_pagar TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_receber TO authenticated;
GRANT ALL ON public.contas_receber TO service_role;