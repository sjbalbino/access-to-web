REVOKE ALL ON FUNCTION public.cleanup_tenant_data(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_tenant_data(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.cleanup_tenant_data(uuid) TO authenticated;