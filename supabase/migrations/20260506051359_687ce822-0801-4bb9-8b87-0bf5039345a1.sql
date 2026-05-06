
-- Applicants per lead
CREATE TABLE public.lead_applicants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  name TEXT NOT NULL,
  employment_type TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_applicants_lead ON public.lead_applicants(lead_id);

ALTER TABLE public.lead_applicants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage applicants on own leads"
ON public.lead_applicants FOR ALL
USING (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
  SELECT 1 FROM leads WHERE leads.id = lead_applicants.lead_id AND leads.broker_id = auth.uid()
))
WITH CHECK (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
  SELECT 1 FROM leads WHERE leads.id = lead_applicants.lead_id AND leads.broker_id = auth.uid()
));

CREATE POLICY "Staff manage applicants on broker leads"
ON public.lead_applicants FOR ALL
USING (has_role(auth.uid(), 'broker_staff'::app_role) AND EXISTS (
  SELECT 1 FROM leads WHERE leads.id = lead_applicants.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())
))
WITH CHECK (has_role(auth.uid(), 'broker_staff'::app_role) AND EXISTS (
  SELECT 1 FROM leads WHERE leads.id = lead_applicants.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())
));

CREATE POLICY "Super admins manage all applicants"
ON public.lead_applicants FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Partners view applicants on own leads"
ON public.lead_applicants FOR SELECT
USING (EXISTS (
  SELECT 1 FROM leads WHERE leads.id = lead_applicants.lead_id AND leads.referral_partner_id = auth.uid()
));

CREATE TRIGGER trg_lead_applicants_updated_at
BEFORE UPDATE ON public.lead_applicants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add applicant + section to document_requests
ALTER TABLE public.document_requests
  ADD COLUMN applicant_id UUID,
  ADD COLUMN section TEXT;

CREATE INDEX idx_document_requests_applicant ON public.document_requests(applicant_id);
