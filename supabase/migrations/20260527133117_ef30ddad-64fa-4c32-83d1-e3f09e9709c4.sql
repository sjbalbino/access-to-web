
-- 1. Create credentials table
CREATE TABLE public.emitentes_nfe_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emitente_id UUID NOT NULL UNIQUE REFERENCES public.emitentes_nfe(id) ON DELETE CASCADE,
  granja_id UUID,
  tenant_id UUID,
  api_consumer_key TEXT,
  api_consumer_secret TEXT,
  api_access_token TEXT,
  api_access_token_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Grants (no anon; admin/gerente reads/writes via authenticated)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emitentes_nfe_credentials TO authenticated;
GRANT ALL ON public.emitentes_nfe_credentials TO service_role;

-- 3. Enable RLS
ALTER TABLE public.emitentes_nfe_credentials ENABLE ROW LEVEL SECURITY;

-- 4. Policies — admin/gerente only, scoped to tenant
CREATE POLICY "credentials_select" ON public.emitentes_nfe_credentials
FOR SELECT TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  AND granja_belongs_to_tenant(granja_id)
);

CREATE POLICY "credentials_insert" ON public.emitentes_nfe_credentials
FOR INSERT TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  AND granja_belongs_to_tenant(granja_id)
);

CREATE POLICY "credentials_update" ON public.emitentes_nfe_credentials
FOR UPDATE TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  AND granja_belongs_to_tenant(granja_id)
);

CREATE POLICY "credentials_delete" ON public.emitentes_nfe_credentials
FOR DELETE TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  AND granja_belongs_to_tenant(granja_id)
);

-- 5. Trigger updated_at
CREATE TRIGGER trg_emitentes_creds_updated_at
BEFORE UPDATE ON public.emitentes_nfe_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Migrate existing data
INSERT INTO public.emitentes_nfe_credentials
  (emitente_id, granja_id, tenant_id, api_consumer_key, api_consumer_secret, api_access_token, api_access_token_secret)
SELECT e.id, e.granja_id, g.tenant_id,
       e.api_consumer_key, e.api_consumer_secret, e.api_access_token, e.api_access_token_secret
FROM public.emitentes_nfe e
LEFT JOIN public.granjas g ON g.id = e.granja_id
WHERE e.api_consumer_key IS NOT NULL
   OR e.api_consumer_secret IS NOT NULL
   OR e.api_access_token IS NOT NULL
   OR e.api_access_token_secret IS NOT NULL;

-- 7. Drop sensitive columns from emitentes_nfe
ALTER TABLE public.emitentes_nfe
  DROP COLUMN IF EXISTS api_consumer_key,
  DROP COLUMN IF EXISTS api_consumer_secret,
  DROP COLUMN IF EXISTS api_access_token,
  DROP COLUMN IF EXISTS api_access_token_secret;
