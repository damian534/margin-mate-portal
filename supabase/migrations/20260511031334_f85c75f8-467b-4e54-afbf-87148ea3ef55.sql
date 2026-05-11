
CREATE TABLE public.lead_pre_approval_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_pre_approval_documents_lead ON public.lead_pre_approval_documents(lead_id);

ALTER TABLE public.lead_pre_approval_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage pre-appr docs on own leads"
ON public.lead_pre_approval_documents FOR ALL
USING (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_pre_approval_documents.lead_id AND leads.broker_id = auth.uid()))
WITH CHECK (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_pre_approval_documents.lead_id AND leads.broker_id = auth.uid()));

CREATE POLICY "Staff manage pre-appr docs on broker leads"
ON public.lead_pre_approval_documents FOR ALL
USING (has_role(auth.uid(), 'broker_staff'::app_role) AND EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_pre_approval_documents.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())))
WITH CHECK (has_role(auth.uid(), 'broker_staff'::app_role) AND EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_pre_approval_documents.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())));

CREATE POLICY "Partners view pre-appr docs on own leads"
ON public.lead_pre_approval_documents FOR SELECT
USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_pre_approval_documents.lead_id AND leads.referral_partner_id = auth.uid()));

CREATE POLICY "Super admins manage all pre-appr docs"
ON public.lead_pre_approval_documents FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));
