ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS subject_to_finance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS finance_due_date date;

CREATE TABLE public.lead_finance_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  requested_by uuid,
  recipient_contact_id uuid,
  recipient_email text NOT NULL,
  recipient_name text,
  recipient_role text,
  previous_due_date date,
  requested_days integer NOT NULL,
  proposed_new_date date,
  message text,
  status text NOT NULL DEFAULT 'sent',
  resend_id text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_finance_ext_lead ON public.lead_finance_extensions(lead_id);

ALTER TABLE public.lead_finance_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage finance ext on own leads"
ON public.lead_finance_extensions FOR ALL
USING (has_role(auth.uid(),'broker'::app_role) AND EXISTS (
  SELECT 1 FROM leads WHERE leads.id = lead_finance_extensions.lead_id AND leads.broker_id = auth.uid()
))
WITH CHECK (has_role(auth.uid(),'broker'::app_role) AND EXISTS (
  SELECT 1 FROM leads WHERE leads.id = lead_finance_extensions.lead_id AND leads.broker_id = auth.uid()
));

CREATE POLICY "Staff manage finance ext on broker leads"
ON public.lead_finance_extensions FOR ALL
USING (has_role(auth.uid(),'broker_staff'::app_role) AND EXISTS (
  SELECT 1 FROM leads WHERE leads.id = lead_finance_extensions.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())
))
WITH CHECK (has_role(auth.uid(),'broker_staff'::app_role) AND EXISTS (
  SELECT 1 FROM leads WHERE leads.id = lead_finance_extensions.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())
));

CREATE POLICY "Partners view finance ext on own leads"
ON public.lead_finance_extensions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM leads WHERE leads.id = lead_finance_extensions.lead_id AND leads.referral_partner_id = auth.uid()
));

CREATE POLICY "Super admins manage all finance ext"
ON public.lead_finance_extensions FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));