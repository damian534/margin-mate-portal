
CREATE POLICY "Referral brokers view referrer profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.leads l
    JOIN public.lead_referrals r ON r.lead_id = l.id
    WHERE l.referral_partner_id IS NOT NULL
      AND (l.referral_partner_id = profiles.user_id OR l.referral_partner_id = profiles.id)
      AND (r.to_broker_id = auth.uid() OR r.from_broker_id = auth.uid())
  )
);
