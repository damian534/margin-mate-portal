REVOKE EXECUTE ON FUNCTION public.can_view_referrer_profile_for_referred_lead(uuid, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_referrer_profile_for_referred_lead(uuid, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_view_referrer_profile_for_referred_lead(uuid, uuid, uuid) TO authenticated;