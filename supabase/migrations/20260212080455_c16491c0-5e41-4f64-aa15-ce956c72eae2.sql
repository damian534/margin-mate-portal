
-- Update handle_new_user to auto-assign super_admin to first user, 
-- or process invite code for referral partners
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite_code text;
  _broker_id uuid;
  _has_any_super_admin boolean;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  -- Check if this is the very first user (no super_admin exists yet)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'super_admin'
  ) INTO _has_any_super_admin;

  IF NOT _has_any_super_admin THEN
    -- First user becomes super_admin
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
    RETURN NEW;
  END IF;

  -- Check for invite code in metadata
  _invite_code := NEW.raw_user_meta_data->>'invite_code';
  
  IF _invite_code IS NOT NULL AND _invite_code != '' THEN
    -- Look up the invite code
    SELECT broker_id INTO _broker_id
    FROM public.invite_codes
    WHERE code = _invite_code
      AND is_active = true
      AND (max_uses IS NULL OR used_count < max_uses)
      AND (expires_at IS NULL OR expires_at > now());
    
    IF _broker_id IS NOT NULL THEN
      -- Link partner to broker
      UPDATE public.profiles SET broker_id = _broker_id WHERE user_id = NEW.id;
      -- Assign referral_partner role
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'referral_partner');
      -- Increment used count
      UPDATE public.invite_codes SET used_count = used_count + 1 WHERE code = _invite_code;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
