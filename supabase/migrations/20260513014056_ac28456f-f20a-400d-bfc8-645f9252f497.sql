CREATE OR REPLACE FUNCTION public.can_view_referrer_profile_for_referred_lead(
  _profile_user_id uuid,
  _profile_id uuid,
  _viewer_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leads l
    JOIN public.lead_referrals r ON r.lead_id = l.id
    WHERE l.referral_partner_id IS NOT NULL
      AND (
        l.referral_partner_id = _profile_user_id
        OR l.referral_partner_id = _profile_id
      )
      AND (
        r.to_broker_id = _viewer_id
        OR r.from_broker_id = _viewer_id
        OR r.to_broker_id = public.get_my_broker_id(_viewer_id)
        OR r.from_broker_id = public.get_my_broker_id(_viewer_id)
        OR public.is_super_admin(_viewer_id)
      )
  );
$$;

DROP POLICY IF EXISTS "Referral brokers view referrer profile" ON public.profiles;

CREATE POLICY "Referral brokers view referrer profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.can_view_referrer_profile_for_referred_lead(user_id, id, auth.uid())
);