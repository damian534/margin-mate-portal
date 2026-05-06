-- Allow brokers (and their staff) to always see leads that came in via their own referral partners,
-- even after the lead has been reassigned to another broker on the team.

CREATE POLICY "Brokers can view leads from own referrers"
ON public.leads
FOR SELECT
USING (
  referral_partner_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = leads.referral_partner_id
      AND p.broker_id = auth.uid()
  )
);

CREATE POLICY "Staff can view leads from broker's referrers"
ON public.leads
FOR SELECT
USING (
  has_role(auth.uid(), 'broker_staff')
  AND referral_partner_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = leads.referral_partner_id
      AND p.broker_id = get_my_broker_id(auth.uid())
  )
);