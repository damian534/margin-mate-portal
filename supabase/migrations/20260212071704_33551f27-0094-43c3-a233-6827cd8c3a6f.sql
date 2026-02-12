
-- Drop existing SELECT policy on leads for partners (it's restrictive, should be permissive)
DROP POLICY IF EXISTS "Partners can view own leads" ON public.leads;

-- Recreate as PERMISSIVE
CREATE POLICY "Partners can view own leads"
ON public.leads
FOR SELECT
TO authenticated
USING (referral_partner_id = auth.uid());
