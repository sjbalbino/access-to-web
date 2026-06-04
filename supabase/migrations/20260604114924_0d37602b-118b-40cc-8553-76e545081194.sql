CREATE TABLE public.rateio_recalculo_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    granja_id UUID NOT NULL REFERENCES public.granjas(id),
    data_inicial DATE NOT NULL,
    data_final DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente', -- 'processando', 'concluido', 'erro'
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.rateio_recalculo_logs TO authenticated;
GRANT ALL ON public.rateio_recalculo_logs TO service_role;

ALTER TABLE public.rateio_recalculo_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs" ON public.rateio_recalculo_logs FOR SELECT USING (true);
CREATE POLICY "Users can create logs" ON public.rateio_recalculo_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their logs" ON public.rateio_recalculo_logs FOR UPDATE USING (auth.uid() = user_id);
