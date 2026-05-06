
-- 1. Profile self-escalation fix
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_director = (SELECT is_director FROM public.profiles WHERE user_id = auth.uid())
  AND broker_id IS NOT DISTINCT FROM (SELECT broker_id FROM public.profiles WHERE user_id = auth.uid())
  AND company_id IS NOT DISTINCT FROM (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND user_id = (SELECT user_id FROM public.profiles WHERE user_id = auth.uid())
);

-- 2. Invite codes - require auth
DROP POLICY IF EXISTS "Anyone can read active invite codes" ON public.invite_codes;

CREATE POLICY "Authenticated users can read active invite codes"
ON public.invite_codes FOR SELECT
TO authenticated
USING (is_active = true);

-- 3. Tool scenarios - remove broad broker read
DROP POLICY IF EXISTS "Brokers can view all scenarios" ON public.tool_scenarios;
