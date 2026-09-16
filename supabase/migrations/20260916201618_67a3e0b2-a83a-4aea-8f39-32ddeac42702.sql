CREATE TABLE public.reatribuicoes_inscricao_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid,
  lote_id uuid NOT NULL,
  tabela text NOT NULL,
  registro_id uuid NOT NULL,
  campo text NOT NULL,
  valor_anterior uuid,
  valor_novo uuid,
  descricao text,
  desfeito_em timestamptz,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reatribuicoes_log_lote ON public.reatribuicoes_inscricao_log (lote_id);
CREATE INDEX idx_reatribuicoes_log_tenant_created ON public.reatribuicoes_inscricao_log (tenant_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.reatribuicoes_inscricao_log TO authenticated;
GRANT ALL ON public.reatribuicoes_inscricao_log TO service_role;

ALTER TABLE public.reatribuicoes_inscricao_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "log_reatribuicao_select" ON public.reatribuicoes_inscricao_log
FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "log_reatribuicao_insert" ON public.reatribuicoes_inscricao_log
FOR INSERT TO authenticated
WITH CHECK (
  public.can_edit(auth.uid())
  AND (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()))
);

CREATE POLICY "log_reatribuicao_update" ON public.reatribuicoes_inscricao_log
FOR UPDATE TO authenticated
USING (
  public.can_edit(auth.uid())
  AND (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()))
)
WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()));