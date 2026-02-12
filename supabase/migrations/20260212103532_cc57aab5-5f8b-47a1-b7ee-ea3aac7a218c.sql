
-- Fix profiles policies: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Brokers can view their partners profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Brokers can update their partners profiles" ON public.profiles;
DROP POLICY IF EXISTS "Brokers can insert partner profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all profiles" ON public.profiles FOR SELECT USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can view their partners profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'broker'::app_role) AND (broker_id = auth.uid() OR user_id = auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Super admins can update all profiles" ON public.profiles FOR UPDATE USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can update their partners profiles" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'broker'::app_role) AND broker_id = auth.uid());
CREATE POLICY "Brokers can insert partner profiles" ON public.profiles FOR INSERT WITH CHECK (has_role(auth.uid(), 'broker'::app_role) AND broker_id = auth.uid());
CREATE POLICY "Super admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (is_super_admin(auth.uid()));

-- Fix companies policies
DROP POLICY IF EXISTS "Partners can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Super admins can do everything with companies" ON public.companies;
DROP POLICY IF EXISTS "Brokers can manage companies" ON public.companies;

CREATE POLICY "Partners can view their own company" ON public.companies FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.company_id = companies.id AND profiles.user_id = auth.uid()));
CREATE POLICY "Super admins can do everything with companies" ON public.companies FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can manage companies" ON public.companies FOR ALL USING (has_role(auth.uid(), 'broker'::app_role));

-- Fix contacts policies
DROP POLICY IF EXISTS "Super admins can do everything with contacts" ON public.contacts;
DROP POLICY IF EXISTS "Brokers can manage own contacts" ON public.contacts;

CREATE POLICY "Super admins can do everything with contacts" ON public.contacts FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can manage own contacts" ON public.contacts FOR ALL USING (has_role(auth.uid(), 'broker'::app_role) AND created_by = auth.uid());

-- Fix invite_codes policies
DROP POLICY IF EXISTS "Super admins can manage all invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Brokers can manage own invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Anyone authenticated can read active invite codes" ON public.invite_codes;

CREATE POLICY "Super admins can manage all invite codes" ON public.invite_codes FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can manage own invite codes" ON public.invite_codes FOR ALL USING (has_role(auth.uid(), 'broker'::app_role) AND broker_id = auth.uid());
CREATE POLICY "Anyone authenticated can read active invite codes" ON public.invite_codes FOR SELECT USING (is_active = true);

-- Fix lead_sources policies
DROP POLICY IF EXISTS "Anyone authenticated can view lead_sources" ON public.lead_sources;
DROP POLICY IF EXISTS "Super admins can manage lead_sources" ON public.lead_sources;
DROP POLICY IF EXISTS "Brokers can manage lead_sources" ON public.lead_sources;

CREATE POLICY "Anyone authenticated can view lead_sources" ON public.lead_sources FOR SELECT USING (true);
CREATE POLICY "Super admins can manage lead_sources" ON public.lead_sources FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can manage lead_sources" ON public.lead_sources FOR ALL USING (has_role(auth.uid(), 'broker'::app_role));

-- Fix lead_statuses policies
DROP POLICY IF EXISTS "Anyone authenticated can view statuses" ON public.lead_statuses;
DROP POLICY IF EXISTS "Super admins can manage lead_statuses" ON public.lead_statuses;
DROP POLICY IF EXISTS "Brokers can manage lead_statuses" ON public.lead_statuses;

CREATE POLICY "Anyone authenticated can view statuses" ON public.lead_statuses FOR SELECT USING (true);
CREATE POLICY "Super admins can manage lead_statuses" ON public.lead_statuses FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can manage lead_statuses" ON public.lead_statuses FOR ALL USING (has_role(auth.uid(), 'broker'::app_role));

-- Fix leads policies
DROP POLICY IF EXISTS "Partners can insert own leads" ON public.leads;
DROP POLICY IF EXISTS "Partners can view own leads" ON public.leads;
DROP POLICY IF EXISTS "Super admins can do everything with leads" ON public.leads;
DROP POLICY IF EXISTS "Brokers can manage own leads" ON public.leads;

CREATE POLICY "Partners can insert own leads" ON public.leads FOR INSERT WITH CHECK (referral_partner_id = auth.uid());
CREATE POLICY "Partners can view own leads" ON public.leads FOR SELECT USING (referral_partner_id = auth.uid());
CREATE POLICY "Super admins can do everything with leads" ON public.leads FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can manage own leads" ON public.leads FOR ALL USING (has_role(auth.uid(), 'broker'::app_role) AND broker_id = auth.uid());

-- Fix notes policies
DROP POLICY IF EXISTS "Partners can view notes on own leads" ON public.notes;
DROP POLICY IF EXISTS "Super admins can do everything with notes" ON public.notes;
DROP POLICY IF EXISTS "Brokers can manage notes on own leads" ON public.notes;

CREATE POLICY "Partners can view notes on own leads" ON public.notes FOR SELECT USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = notes.lead_id AND leads.referral_partner_id = auth.uid()));
CREATE POLICY "Super admins can do everything with notes" ON public.notes FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can manage notes on own leads" ON public.notes FOR ALL USING (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (SELECT 1 FROM leads WHERE leads.id = notes.lead_id AND leads.broker_id = auth.uid()));

-- Fix tasks policies
DROP POLICY IF EXISTS "Super admins can do everything with tasks" ON public.tasks;
DROP POLICY IF EXISTS "Brokers can manage tasks on own leads" ON public.tasks;

CREATE POLICY "Super admins can do everything with tasks" ON public.tasks FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Brokers can manage tasks on own leads" ON public.tasks FOR ALL USING (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (SELECT 1 FROM leads WHERE leads.id = tasks.lead_id AND leads.broker_id = auth.uid()));

-- Fix user_roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can update roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can manage roles" ON public.user_roles FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update roles" ON public.user_roles FOR UPDATE USING (is_super_admin(auth.uid()));
