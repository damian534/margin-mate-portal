CREATE OR REPLACE FUNCTION public.get_user_tenant_broker_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('broker','super_admin')) THEN _user_id
    ELSE (SELECT broker_id FROM public.profiles WHERE user_id = _user_id LIMIT 1)
  END
$$;

CREATE POLICY "Team members can view teammate roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.get_user_tenant_broker_id(user_id) IS NOT NULL
  AND public.get_user_tenant_broker_id(user_id) = public.get_my_broker_id(auth.uid())
);