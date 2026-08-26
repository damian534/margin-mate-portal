CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _invite_code text;
  _broker_id uuid;
  _target_role text;
  _has_any_super_admin boolean;
  _existing_profile_id uuid;
  _tenant_id uuid;
BEGIN
  SELECT id, broker_id INTO _existing_profile_id, _broker_id
  FROM public.profiles WHERE lower(email) = lower(NEW.email) LIMIT 1;

  IF _existing_profile_id IS NOT NULL THEN
    UPDATE public.profiles
    SET user_id = NEW.id,
        full_name = COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), full_name)
    WHERE id = _existing_profile_id;

    _invite_code := trim(NEW.raw_user_meta_data->>'invite_code');
    IF _invite_code IS NOT NULL AND _invite_code != '' THEN
      SELECT broker_id, COALESCE(target_role, 'referral_partner')
      INTO _broker_id, _target_role
      FROM public.invite_codes
      WHERE upper(trim(code)) = upper(_invite_code) AND is_active = true
        AND (max_uses IS NULL OR used_count < max_uses)
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY created_at DESC
      LIMIT 1;

      IF _broker_id IS NOT NULL THEN
        SELECT tenant_id INTO _tenant_id FROM public.profiles WHERE user_id = _broker_id LIMIT 1;
        UPDATE public.profiles
          SET broker_id = _broker_id,
              tenant_id = COALESCE(_tenant_id, tenant_id)
          WHERE id = _existing_profile_id;
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _target_role::app_role) ON CONFLICT DO NOTHING;
        UPDATE public.invite_codes SET used_count = used_count + 1 WHERE upper(trim(code)) = upper(_invite_code);
      END IF;
    ELSIF _broker_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'referral_partner') ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') INTO _has_any_super_admin;

  IF NOT _has_any_super_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
    RETURN NEW;
  END IF;

  _invite_code := trim(NEW.raw_user_meta_data->>'invite_code');
  IF _invite_code IS NOT NULL AND _invite_code != '' THEN
    SELECT broker_id, COALESCE(target_role, 'referral_partner')
    INTO _broker_id, _target_role
    FROM public.invite_codes
    WHERE upper(trim(code)) = upper(_invite_code) AND is_active = true
      AND (max_uses IS NULL OR used_count < max_uses)
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY created_at DESC
    LIMIT 1;

    IF _broker_id IS NOT NULL THEN
      SELECT tenant_id INTO _tenant_id FROM public.profiles WHERE user_id = _broker_id LIMIT 1;
      UPDATE public.profiles
        SET broker_id = _broker_id,
            tenant_id = COALESCE(_tenant_id, tenant_id)
        WHERE user_id = NEW.id;
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _target_role::app_role) ON CONFLICT DO NOTHING;
      UPDATE public.invite_codes SET used_count = used_count + 1 WHERE upper(trim(code)) = upper(_invite_code);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tenant_seat_usage(_tenant_id uuid)
RETURNS TABLE(broker_seats integer, staff_seats integer, monthly_total numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH members AS (
    SELECT ur.role
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE p.tenant_id = _tenant_id
  ), counted AS (
    SELECT
      COUNT(*) FILTER (WHERE role IN ('broker','super_admin'))::int AS b,
      COUNT(*) FILTER (WHERE role = 'broker_staff')::int AS s
    FROM members
  )
  SELECT b, s, (b * 299 + s * 99)::numeric FROM counted;
$$;

REVOKE EXECUTE ON FUNCTION public.tenant_seat_usage(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.tenant_seat_usage(uuid) TO authenticated;