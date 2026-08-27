CREATE OR REPLACE FUNCTION public.is_platform_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'platform_owner'::public.app_role
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_platform_owner(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_platform_owner(uuid) TO authenticated;

INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'platform_owner'::public.app_role
FROM public.user_roles
WHERE role = 'super_admin'::public.app_role
ON CONFLICT (user_id, role) DO NOTHING;