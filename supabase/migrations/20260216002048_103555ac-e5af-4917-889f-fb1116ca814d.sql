
-- Add target_role column to invite_codes
ALTER TABLE public.invite_codes ADD COLUMN IF NOT EXISTS target_role text DEFAULT 'referral_partner';

-- Update get_my_broker_id to include broker_staff
CREATE OR REPLACE FUNCTION public.get_my_broker_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('broker', 'super_admin')) THEN _user_id
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'broker_staff') THEN (SELECT broker_id FROM public.profiles WHERE user_id = _user_id LIMIT 1)
    ELSE (SELECT broker_id FROM public.profiles WHERE user_id = _user_id LIMIT 1)
  END
$$;

-- Helper function
CREATE OR REPLACE FUNCTION public.is_broker_or_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('broker', 'broker_staff')
  )
$$;

-- RLS: Staff can manage broker leads
CREATE POLICY "Staff can manage broker leads"
ON public.leads FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'broker_staff'::app_role)
  AND broker_id = (SELECT broker_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
)
WITH CHECK (
  has_role(auth.uid(), 'broker_staff'::app_role)
  AND broker_id = (SELECT broker_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- RLS: Staff can manage notes on broker leads
CREATE POLICY "Staff can manage notes on broker leads"
ON public.notes FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'broker_staff'::app_role)
  AND EXISTS (SELECT 1 FROM leads WHERE leads.id = notes.lead_id AND leads.broker_id = (SELECT broker_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1))
);

-- RLS: Staff can manage tasks on broker leads
CREATE POLICY "Staff can manage tasks on broker leads"
ON public.tasks FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'broker_staff'::app_role)
  AND EXISTS (SELECT 1 FROM leads WHERE leads.id = tasks.lead_id AND leads.broker_id = (SELECT broker_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1))
);

-- RLS: Staff can manage broker contacts
CREATE POLICY "Staff can manage broker contacts"
ON public.contacts FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'broker_staff'::app_role)
  AND created_by = (SELECT broker_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- RLS: Staff can view companies
CREATE POLICY "Staff can view companies"
ON public.companies FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'broker_staff'::app_role));

-- RLS: Staff can view broker profiles
CREATE POLICY "Staff can view broker profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'broker_staff'::app_role)
  AND (
    broker_id = (SELECT p.broker_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
    OR user_id = auth.uid()
  )
);

-- RLS: Staff can manage broker settlements
CREATE POLICY "Staff can manage broker settlements"
ON public.settlements FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'broker_staff'::app_role)
  AND broker_id = (SELECT broker_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
)
WITH CHECK (
  has_role(auth.uid(), 'broker_staff'::app_role)
  AND broker_id = (SELECT broker_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- RLS: Staff can view broker settlement targets
CREATE POLICY "Staff can view broker settlement targets"
ON public.settlement_targets FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'broker_staff'::app_role)
  AND broker_id = (SELECT broker_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- RLS: Staff can manage broker activity
CREATE POLICY "Staff can manage broker activity"
ON public.broker_activity FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'broker_staff'::app_role)
  AND broker_id = (SELECT broker_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
)
WITH CHECK (
  has_role(auth.uid(), 'broker_staff'::app_role)
  AND broker_id = (SELECT broker_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- RLS: Staff can view broker activity targets
CREATE POLICY "Staff can view broker activity targets"
ON public.broker_activity_targets FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'broker_staff'::app_role)
  AND broker_id = (SELECT broker_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- RLS: Staff can manage own tool scenarios
CREATE POLICY "Staff can manage own scenarios"
ON public.tool_scenarios FOR ALL TO authenticated
USING (has_role(auth.uid(), 'broker_staff'::app_role) AND user_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'broker_staff'::app_role) AND user_id = auth.uid());

-- RLS: Staff can view tool visibility
CREATE POLICY "Staff can view tool visibility"
ON public.tool_visibility FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'broker_staff'::app_role));

-- Update handle_new_user trigger to use target_role from invite_codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite_code text;
  _broker_id uuid;
  _target_role text;
  _has_any_super_admin boolean;
  _existing_profile_id uuid;
BEGIN
  SELECT id, broker_id INTO _existing_profile_id, _broker_id
  FROM public.profiles WHERE email = NEW.email LIMIT 1;

  IF _existing_profile_id IS NOT NULL THEN
    UPDATE public.profiles
    SET user_id = NEW.id,
        full_name = COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), full_name)
    WHERE id = _existing_profile_id;

    _invite_code := NEW.raw_user_meta_data->>'invite_code';
    IF _invite_code IS NOT NULL AND _invite_code != '' THEN
      SELECT broker_id, COALESCE(target_role, 'referral_partner')
      INTO _broker_id, _target_role
      FROM public.invite_codes
      WHERE code = _invite_code AND is_active = true
        AND (max_uses IS NULL OR used_count < max_uses)
        AND (expires_at IS NULL OR expires_at > now());

      IF _broker_id IS NOT NULL THEN
        UPDATE public.profiles SET broker_id = _broker_id WHERE id = _existing_profile_id;
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _target_role::app_role) ON CONFLICT DO NOTHING;
        UPDATE public.invite_codes SET used_count = used_count + 1 WHERE code = _invite_code;
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

  _invite_code := NEW.raw_user_meta_data->>'invite_code';
  IF _invite_code IS NOT NULL AND _invite_code != '' THEN
    SELECT broker_id, COALESCE(target_role, 'referral_partner')
    INTO _broker_id, _target_role
    FROM public.invite_codes
    WHERE code = _invite_code AND is_active = true
      AND (max_uses IS NULL OR used_count < max_uses)
      AND (expires_at IS NULL OR expires_at > now());

    IF _broker_id IS NOT NULL THEN
      UPDATE public.profiles SET broker_id = _broker_id WHERE user_id = NEW.id;
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _target_role::app_role);
      UPDATE public.invite_codes SET used_count = used_count + 1 WHERE code = _invite_code;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
