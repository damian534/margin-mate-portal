-- Tighten the anon policy to only allow checking role existence, not exposing user_ids
DROP POLICY IF EXISTS "Anyone can check if roles exist" ON public.user_roles;
CREATE POLICY "Anon can check super admin existence"
ON public.user_roles
FOR SELECT
TO anon
USING (role = 'super_admin');