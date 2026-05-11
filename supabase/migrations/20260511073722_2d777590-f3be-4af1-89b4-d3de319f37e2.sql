
-- Replace the single ALL policy with split read/write policies
DROP POLICY IF EXISTS "Broker or super admin manages own milestone templates" ON public.milestone_email_templates;
DROP POLICY IF EXISTS "Broker or super admin manages own email settings" ON public.broker_email_settings;

-- Templates: read = broker, their staff, or super admin
CREATE POLICY "Read milestone templates (broker, staff, super admin)"
ON public.milestone_email_templates
FOR SELECT
TO authenticated
USING (
  broker_id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR broker_id = public.get_my_broker_id(auth.uid())
);

CREATE POLICY "Write milestone templates (broker or super admin only)"
ON public.milestone_email_templates
FOR INSERT TO authenticated
WITH CHECK (broker_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Update milestone templates (broker or super admin only)"
ON public.milestone_email_templates
FOR UPDATE TO authenticated
USING (broker_id = auth.uid() OR public.is_super_admin(auth.uid()))
WITH CHECK (broker_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Delete milestone templates (broker or super admin only)"
ON public.milestone_email_templates
FOR DELETE TO authenticated
USING (broker_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- BCC settings: read = broker, their staff, or super admin
CREATE POLICY "Read email settings (broker, staff, super admin)"
ON public.broker_email_settings
FOR SELECT
TO authenticated
USING (
  broker_id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR broker_id = public.get_my_broker_id(auth.uid())
);

CREATE POLICY "Write email settings (broker or super admin only)"
ON public.broker_email_settings
FOR INSERT TO authenticated
WITH CHECK (broker_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Update email settings (broker or super admin only)"
ON public.broker_email_settings
FOR UPDATE TO authenticated
USING (broker_id = auth.uid() OR public.is_super_admin(auth.uid()))
WITH CHECK (broker_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Delete email settings (broker or super admin only)"
ON public.broker_email_settings
FOR DELETE TO authenticated
USING (broker_id = auth.uid() OR public.is_super_admin(auth.uid()));
