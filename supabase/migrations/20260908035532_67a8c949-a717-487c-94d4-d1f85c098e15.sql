CREATE OR REPLACE FUNCTION public.chat_directory()
RETURNS TABLE(user_id uuid, full_name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.email
  FROM public.profiles p
  WHERE p.user_id IS NOT NULL
    AND p.tenant_id IS NOT NULL
    AND p.tenant_id = public.get_my_tenant_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.user_id
        AND ur.role IN ('broker','broker_staff','super_admin','platform_owner','tenant_owner')
    )
  ORDER BY p.full_name
$$;

REVOKE ALL ON FUNCTION public.chat_directory() FROM public;
GRANT EXECUTE ON FUNCTION public.chat_directory() TO authenticated;