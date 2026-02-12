
-- Allow brokers and super admins to INSERT profiles (for manually adding partners)
CREATE POLICY "Brokers can insert partner profiles"
ON public.profiles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'broker'::app_role) AND broker_id = auth.uid());

CREATE POLICY "Super admins can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

-- Update handle_new_user to check for existing profile by email and link instead of duplicating
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _invite_code text;
  _broker_id uuid;
  _has_any_super_admin boolean;
  _existing_profile_id uuid;
BEGIN
  -- Check if a profile with this email already exists (manually created by a broker)
  SELECT id, broker_id INTO _existing_profile_id, _broker_id
  FROM public.profiles
  WHERE email = NEW.email
  LIMIT 1;

  IF _existing_profile_id IS NOT NULL THEN
    -- Link existing profile to the new auth user
    UPDATE public.profiles
    SET user_id = NEW.id,
        full_name = COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), full_name)
    WHERE id = _existing_profile_id;

    -- If profile already had a broker_id, assign referral_partner role
    IF _broker_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'referral_partner')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Still check invite code for broker linkage if not already set
    _invite_code := NEW.raw_user_meta_data->>'invite_code';
    IF _broker_id IS NULL AND _invite_code IS NOT NULL AND _invite_code != '' THEN
      SELECT broker_id INTO _broker_id
      FROM public.invite_codes
      WHERE code = _invite_code
        AND is_active = true
        AND (max_uses IS NULL OR used_count < max_uses)
        AND (expires_at IS NULL OR expires_at > now());

      IF _broker_id IS NOT NULL THEN
        UPDATE public.profiles SET broker_id = _broker_id WHERE id = _existing_profile_id;
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'referral_partner')
        ON CONFLICT DO NOTHING;
        UPDATE public.invite_codes SET used_count = used_count + 1 WHERE code = _invite_code;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- No existing profile — create new one
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  -- Check if this is the very first user (no super_admin exists yet)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'super_admin'
  ) INTO _has_any_super_admin;

  IF NOT _has_any_super_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
    RETURN NEW;
  END IF;

  -- Check for invite code in metadata
  _invite_code := NEW.raw_user_meta_data->>'invite_code';

  IF _invite_code IS NOT NULL AND _invite_code != '' THEN
    SELECT broker_id INTO _broker_id
    FROM public.invite_codes
    WHERE code = _invite_code
      AND is_active = true
      AND (max_uses IS NULL OR used_count < max_uses)
      AND (expires_at IS NULL OR expires_at > now());

    IF _broker_id IS NOT NULL THEN
      UPDATE public.profiles SET broker_id = _broker_id WHERE user_id = NEW.id;
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'referral_partner');
      UPDATE public.invite_codes SET used_count = used_count + 1 WHERE code = _invite_code;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
