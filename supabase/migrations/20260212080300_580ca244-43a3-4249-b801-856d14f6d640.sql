
-- Create is_super_admin helper
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Create get_my_broker_id helper
CREATE OR REPLACE FUNCTION public.get_my_broker_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('broker', 'super_admin')) THEN _user_id
    ELSE (SELECT broker_id FROM public.profiles WHERE user_id = _user_id LIMIT 1)
  END
$$;

-- == LEADS ==
DROP POLICY IF EXISTS "Brokers can do everything with leads" ON public.leads;
CREATE POLICY "Super admins can do everything with leads"
  ON public.leads FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can manage own leads"
  ON public.leads FOR ALL USING (has_role(auth.uid(), 'broker') AND broker_id = auth.uid());

-- == PROFILES ==
DROP POLICY IF EXISTS "Brokers can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can view their partners profiles"
  ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'broker') AND (broker_id = auth.uid() OR user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Super admins can update all profiles"
  ON public.profiles FOR UPDATE USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can update their partners profiles"
  ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'broker') AND broker_id = auth.uid());

-- == NOTES ==
DROP POLICY IF EXISTS "Brokers can do everything with notes" ON public.notes;
CREATE POLICY "Super admins can do everything with notes"
  ON public.notes FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can manage notes on own leads"
  ON public.notes FOR ALL USING (has_role(auth.uid(), 'broker') AND EXISTS (
    SELECT 1 FROM public.leads WHERE leads.id = notes.lead_id AND leads.broker_id = auth.uid()
  ));

-- == TASKS ==
DROP POLICY IF EXISTS "Brokers can do everything with tasks" ON public.tasks;
CREATE POLICY "Super admins can do everything with tasks"
  ON public.tasks FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can manage tasks on own leads"
  ON public.tasks FOR ALL USING (has_role(auth.uid(), 'broker') AND EXISTS (
    SELECT 1 FROM public.leads WHERE leads.id = tasks.lead_id AND leads.broker_id = auth.uid()
  ));

-- == CONTACTS ==
DROP POLICY IF EXISTS "Brokers can do everything with contacts" ON public.contacts;
CREATE POLICY "Super admins can do everything with contacts"
  ON public.contacts FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can manage own contacts"
  ON public.contacts FOR ALL USING (has_role(auth.uid(), 'broker') AND created_by = auth.uid());

-- == COMPANIES ==
DROP POLICY IF EXISTS "Brokers can do everything with companies" ON public.companies;
CREATE POLICY "Super admins can do everything with companies"
  ON public.companies FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can manage companies"
  ON public.companies FOR ALL USING (has_role(auth.uid(), 'broker'));

-- == LEAD_STATUSES ==
DROP POLICY IF EXISTS "Brokers can do everything with lead_statuses" ON public.lead_statuses;
CREATE POLICY "Super admins can manage lead_statuses"
  ON public.lead_statuses FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can manage lead_statuses"
  ON public.lead_statuses FOR ALL USING (has_role(auth.uid(), 'broker'));

-- == LEAD_SOURCES ==
DROP POLICY IF EXISTS "Brokers can do everything with lead_sources" ON public.lead_sources;
CREATE POLICY "Super admins can manage lead_sources"
  ON public.lead_sources FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can manage lead_sources"
  ON public.lead_sources FOR ALL USING (has_role(auth.uid(), 'broker'));

-- == USER_ROLES ==
DROP POLICY IF EXISTS "Brokers can manage roles" ON public.user_roles;
CREATE POLICY "Super admins can manage roles"
  ON public.user_roles FOR ALL USING (is_super_admin(auth.uid()));

-- == INVITE_CODES ==
CREATE POLICY "Super admins can manage all invite codes"
  ON public.invite_codes FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can manage own invite codes"
  ON public.invite_codes FOR ALL USING (has_role(auth.uid(), 'broker') AND broker_id = auth.uid());
CREATE POLICY "Anyone authenticated can read active invite codes"
  ON public.invite_codes FOR SELECT USING (is_active = true);
