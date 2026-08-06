CREATE TABLE public.cotacoes_mercado (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'graos',
  regiao TEXT,
  unidade TEXT NOT NULL,
  valor NUMERIC(14,4) NOT NULL,
  variacao_percentual NUMERIC(8,4),
  fonte TEXT NOT NULL,
  fonte_url TEXT,
  data_referencia DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug, data_referencia)
);

CREATE INDEX idx_cotacoes_mercado_slug_data ON public.cotacoes_mercado (slug, data_referencia DESC);
CREATE INDEX idx_cotacoes_mercado_data ON public.cotacoes_mercado (data_referencia DESC);

GRANT SELECT ON public.cotacoes_mercado TO anon;
GRANT SELECT ON public.cotacoes_mercado TO authenticated;
GRANT ALL ON public.cotacoes_mercado TO service_role;

ALTER TABLE public.cotacoes_mercado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cotacoes sao publicas para leitura"
ON public.cotacoes_mercado FOR SELECT
USING (true);

CREATE TRIGGER update_cotacoes_mercado_updated_at
BEFORE UPDATE ON public.cotacoes_mercado
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.leads_portal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  empresa TEXT,
  email TEXT NOT NULL,
  telefone TEXT,
  cidade TEXT,
  uf TEXT,
  qtd_produtores TEXT,
  mensagem TEXT,
  origem TEXT NOT NULL DEFAULT 'portal',
  status TEXT NOT NULL DEFAULT 'novo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_portal_created ON public.leads_portal (created_at DESC);

GRANT INSERT ON public.leads_portal TO anon;
GRANT INSERT ON public.leads_portal TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.leads_portal TO authenticated;
GRANT ALL ON public.leads_portal TO service_role;

ALTER TABLE public.leads_portal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer visitante pode enviar lead"
ON public.leads_portal FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins podem ver leads"
ON public.leads_portal FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar leads"
ON public.leads_portal FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins podem excluir leads"
ON public.leads_portal FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

CREATE TRIGGER update_leads_portal_updated_at
BEFORE UPDATE ON public.leads_portal
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cotacoes_status_coleta (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fonte TEXT NOT NULL,
  sucesso BOOLEAN NOT NULL,
  detalhe TEXT,
  itens_gravados INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cotacoes_status_coleta TO anon;
GRANT SELECT ON public.cotacoes_status_coleta TO authenticated;
GRANT ALL ON public.cotacoes_status_coleta TO service_role;

ALTER TABLE public.cotacoes_status_coleta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Status de coleta e publico para leitura"
ON public.cotacoes_status_coleta FOR SELECT
USING (true);