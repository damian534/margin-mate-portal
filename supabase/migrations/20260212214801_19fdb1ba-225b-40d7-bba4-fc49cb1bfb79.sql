-- Allow anonymous users to validate invite codes during registration
DROP POLICY IF EXISTS "Anyone authenticated can read active invite codes" ON public.invite_codes;
CREATE POLICY "Anyone can read active invite codes"
ON public.invite_codes
FOR SELECT
USING (is_active = true);

-- Allow anonymous users to check if a super_admin exists (for registration flow)
DROP POLICY IF EXISTS "Anyone can check super admin existence" ON public.user_roles;
CREATE POLICY "Anyone can check if roles exist"
ON public.user_roles
FOR SELECT
TO anon
USING (true);