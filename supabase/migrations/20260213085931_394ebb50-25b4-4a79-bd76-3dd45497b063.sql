-- Create RPC function that only returns boolean (no user_id exposure)
CREATE OR REPLACE FUNCTION public.has_any_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin');
$$;

GRANT EXECUTE ON FUNCTION public.has_any_super_admin() TO anon, authenticated;

-- Remove the anon SELECT policy that exposes user_ids
DROP POLICY IF EXISTS "Anon can check super admin existence" ON public.user_roles;