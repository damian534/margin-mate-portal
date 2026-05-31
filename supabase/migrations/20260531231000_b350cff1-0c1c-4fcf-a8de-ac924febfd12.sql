ALTER TABLE public.invite_codes ADD COLUMN IF NOT EXISTS profile_id uuid;

CREATE OR REPLACE FUNCTION public.get_invite_preview(_code text)
RETURNS TABLE(email text, full_name text, company_name text, company_id uuid, target_role text, is_valid boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH ic AS (
    SELECT *
    FROM public.invite_codes
    WHERE upper(trim(code)) = upper(trim(_code))
      AND is_active = true
      AND (max_uses IS NULL OR used_count < max_uses)
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY created_at DESC
    LIMIT 1
  )
  SELECT
    p.email,
    p.full_name,
    p.company_name,
    p.company_id,
    COALESCE(ic.target_role, 'referral_partner') AS target_role,
    (ic.id IS NOT NULL) AS is_valid
  FROM ic
  LEFT JOIN public.profiles p ON p.id = ic.profile_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_preview(text) TO anon, authenticated;