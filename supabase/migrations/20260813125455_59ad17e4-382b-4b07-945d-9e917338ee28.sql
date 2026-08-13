CREATE TABLE public.controle_conjuntos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.get_user_tenant_id(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT controle_conjuntos_nome_unico UNIQUE (tenant_id, nome)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.controle_conjuntos TO authenticated;
GRANT ALL ON public.controle_conjuntos TO service_role;

ALTER TABLE public.controle_conjuntos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "controle_conjuntos_select" ON public.controle_conjuntos
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "controle_conjuntos_insert" ON public.controle_conjuntos
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.can_edit(auth.uid()));
CREATE POLICY "controle_conjuntos_update" ON public.controle_conjuntos
  FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.can_edit(auth.uid()));
CREATE POLICY "controle_conjuntos_delete" ON public.controle_conjuntos
  FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.can_edit(auth.uid()));

CREATE TRIGGER update_controle_conjuntos_updated_at
  BEFORE UPDATE ON public.controle_conjuntos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.controle_marcacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.get_user_tenant_id(),
  conjunto_id UUID NOT NULL REFERENCES public.controle_conjuntos(id) ON DELETE CASCADE,
  documento_tipo TEXT NOT NULL CHECK (documento_tipo IN ('transferencia_deposito','compra_cereal','contrato_venda','remessa_venda','nota_deposito','devolucao_deposito')),
  documento_id UUID NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT controle_marcacoes_unica UNIQUE (conjunto_id, documento_tipo, documento_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.controle_marcacoes TO authenticated;
GRANT ALL ON public.controle_marcacoes TO service_role;

ALTER TABLE public.controle_marcacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "controle_marcacoes_select" ON public.controle_marcacoes
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "controle_marcacoes_insert" ON public.controle_marcacoes
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.can_edit(auth.uid()));
CREATE POLICY "controle_marcacoes_update" ON public.controle_marcacoes
  FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.can_edit(auth.uid()));
CREATE POLICY "controle_marcacoes_delete" ON public.controle_marcacoes
  FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.can_edit(auth.uid()));

CREATE TRIGGER update_controle_marcacoes_updated_at
  BEFORE UPDATE ON public.controle_marcacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_controle_marcacoes_tenant_conjunto ON public.controle_marcacoes (tenant_id, conjunto_id);
CREATE INDEX idx_controle_marcacoes_documento ON public.controle_marcacoes (documento_tipo, documento_id);