
CREATE TABLE public.dfe_nfes_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  inscricao_id uuid NOT NULL REFERENCES public.inscricoes_produtor(id) ON DELETE CASCADE,
  chave text NOT NULL,
  numero text,
  serie text,
  nome text,
  cnpj text,
  valor numeric,
  data_emissao text,
  situacao text,
  tipo_nfe text,
  manifestacao_destinatario text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inscricao_id, chave)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dfe_nfes_cache TO authenticated;
GRANT ALL ON public.dfe_nfes_cache TO service_role;

ALTER TABLE public.dfe_nfes_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_dfe_cache" ON public.dfe_nfes_cache
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "tenant_insert_dfe_cache" ON public.dfe_nfes_cache
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "tenant_update_dfe_cache" ON public.dfe_nfes_cache
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "tenant_delete_dfe_cache" ON public.dfe_nfes_cache
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_dfe_cache_updated_at
  BEFORE UPDATE ON public.dfe_nfes_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
