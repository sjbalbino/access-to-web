CREATE TABLE public.extratos_bancarios (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    conta_bancaria_id UUID NOT NULL REFERENCES public.contas_bancarias(id),
    data_transacao DATE NOT NULL,
    valor DECIMAL(18,2) NOT NULL,
    descricao TEXT NOT NULL,
    documento TEXT,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    fitid TEXT, -- Identificador único do OFX para evitar duplicidade
    conciliado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.extratos_bancarios TO authenticated;
GRANT ALL ON public.extratos_bancarios TO service_role;
ALTER TABLE public.extratos_bancarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own bank statements" ON public.extratos_bancarios FOR ALL USING (true) WITH CHECK (true);

-- Adicionar colunas de conciliação nas tabelas de movimentação
ALTER TABLE public.contas_pagar_baixas ADD COLUMN IF NOT EXISTS conciliado BOOLEAN DEFAULT FALSE;
ALTER TABLE public.contas_pagar_baixas ADD COLUMN IF NOT EXISTS extrato_id UUID REFERENCES public.extratos_bancarios(id);

ALTER TABLE public.contas_receber_baixas ADD COLUMN IF NOT EXISTS conciliado BOOLEAN DEFAULT FALSE;
ALTER TABLE public.contas_receber_baixas ADD COLUMN IF NOT EXISTS extrato_id UUID REFERENCES public.extratos_bancarios(id);

ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS conciliado BOOLEAN DEFAULT FALSE;
ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS extrato_id UUID REFERENCES public.extratos_bancarios(id);
