
CREATE TABLE public.configuracoes_balanca (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE,
  caminho_hint TEXT NOT NULL DEFAULT 'C:\LESBR\peso.txt',
  decimal TEXT NOT NULL DEFAULT ',',
  unidade TEXT NOT NULL DEFAULT 'kg',
  regex TEXT,
  poll_ms INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_balanca TO authenticated;
GRANT ALL ON public.configuracoes_balanca TO service_role;

ALTER TABLE public.configuracoes_balanca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_same_tenant" ON public.configuracoes_balanca
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "insert_same_tenant" ON public.configuracoes_balanca
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "update_same_tenant" ON public.configuracoes_balanca
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "delete_same_tenant" ON public.configuracoes_balanca
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE TRIGGER update_configuracoes_balanca_updated_at
  BEFORE UPDATE ON public.configuracoes_balanca
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
