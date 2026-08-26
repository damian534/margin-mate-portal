REVOKE EXECUTE ON FUNCTION public.get_my_tenant_id(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_tenant_owner(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_my_tenant_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_owner(uuid) TO authenticated;