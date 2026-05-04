CREATE POLICY "Receiving broker can view referred leads"
ON public.leads FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.lead_referrals r
  WHERE r.lead_id = leads.id
    AND r.to_broker_id = auth.uid()
    AND r.status IN ('pending','accepted')
));