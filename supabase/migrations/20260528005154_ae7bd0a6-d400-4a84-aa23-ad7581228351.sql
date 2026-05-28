
ALTER TABLE public.entradas_nfe
  ADD COLUMN IF NOT EXISTS inscricao_produtor_id UUID REFERENCES public.inscricoes_produtor(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS safra_id UUID REFERENCES public.safras(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS conta_bancaria_id UUID REFERENCES public.contas_bancarias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_entradas_nfe_inscricao ON public.entradas_nfe(inscricao_produtor_id);
CREATE INDEX IF NOT EXISTS idx_entradas_nfe_safra ON public.entradas_nfe(safra_id);

ALTER TABLE public.entradas_nfe
  DROP CONSTRAINT IF EXISTS entradas_nfe_forma_pagamento_check;
ALTER TABLE public.entradas_nfe
  ADD CONSTRAINT entradas_nfe_forma_pagamento_check
  CHECK (forma_pagamento IS NULL OR forma_pagamento IN ('pix','dinheiro','cheque','boleto','cartao','prazo','outro'));
