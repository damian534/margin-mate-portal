DROP POLICY IF EXISTS "Brokers can view leads from own referrers" ON public.leads;
CREATE POLICY "Brokers can view leads from own referrers"
ON public.leads FOR SELECT
USING (
  referral_partner_id IS NOT NULL
  AND (leads.broker_id IS NULL OR leads.broker_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = leads.referral_partner_id AND p.broker_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Staff can view leads from broker's referrers" ON public.leads;
CREATE POLICY "Staff can view leads from broker's referrers"
ON public.leads FOR SELECT
USING (
  has_role(auth.uid(), 'broker_staff'::app_role)
  AND referral_partner_id IS NOT NULL
  AND (leads.broker_id IS NULL OR leads.broker_id = public.get_my_broker_id(auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = leads.referral_partner_id AND p.broker_id = public.get_my_broker_id(auth.uid())
  )
);
