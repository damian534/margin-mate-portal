REVOKE EXECUTE ON FUNCTION public.can_manage_lead(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_view_lead_partner(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_manage_lead(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_lead_partner(uuid) TO authenticated, service_role;