
CREATE OR REPLACE FUNCTION public.get_or_create_company_invite_code(_company_id uuid)
RETURNS TABLE(code text, id uuid, used_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _broker_id uuid := public.get_my_broker_id(auth.uid());
  _company_name text;
  _slug text;
  _suffix text;
  _new_code text;
  _existing_id uuid;
  _existing_code text;
  _existing_used int;
  _attempt int := 0;
BEGIN
  IF _broker_id IS NULL THEN
    RAISE EXCEPTION 'No broker context for current user';
  END IF;

  SELECT ic.id, ic.code, ic.used_count
    INTO _existing_id, _existing_code, _existing_used
    FROM public.invite_codes ic
    WHERE ic.broker_id = _broker_id
      AND ic.company_id = _company_id
      AND ic.is_active = true
      AND ic.target_role = 'referral_partner'
    ORDER BY ic.created_at DESC
    LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    code := _existing_code;
    id := _existing_id;
    used_count := _existing_used;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT c.name INTO _company_name FROM public.companies c WHERE c.id = _company_id;
  IF _company_name IS NULL THEN
    RAISE EXCEPTION 'Company not found';
  END IF;

  _slug := upper(regexp_replace(_company_name, '[^A-Za-z0-9]', '', 'g'));
  _slug := substring(_slug, 1, 6);
  IF length(_slug) < 2 THEN _slug := 'AGC'; END IF;

  LOOP
    _attempt := _attempt + 1;
    _suffix := upper(substring(encode(extensions.gen_random_bytes(3), 'hex') from 1 for 4));
    _new_code := 'MF-' || _slug || '-' || _suffix;
    BEGIN
      INSERT INTO public.invite_codes (broker_id, code, label, target_role, company_id, is_active)
      VALUES (_broker_id, _new_code, _company_name, 'referral_partner', _company_id, true)
      RETURNING invite_codes.id, invite_codes.code, invite_codes.used_count
        INTO _existing_id, _existing_code, _existing_used;
      code := _existing_code;
      id := _existing_id;
      used_count := _existing_used;
      RETURN NEXT;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      IF _attempt > 5 THEN RAISE; END IF;
    END;
  END LOOP;
END;
$$;
