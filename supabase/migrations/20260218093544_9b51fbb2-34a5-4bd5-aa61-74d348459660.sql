
-- Fact find responses: stores structured data per lead per section
CREATE TABLE public.fact_find_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  section TEXT NOT NULL, -- e.g. 'personal_details', 'employment', 'income', etc.
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_by TEXT NULL, -- 'broker' or 'client'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id, section)
);

ALTER TABLE public.fact_find_responses ENABLE ROW LEVEL SECURITY;

-- Broker/staff/super_admin can manage fact finds on their leads
CREATE POLICY "Brokers can manage fact finds on own leads"
  ON public.fact_find_responses FOR ALL
  USING (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
    SELECT 1 FROM leads WHERE leads.id = fact_find_responses.lead_id AND leads.broker_id = auth.uid()
  ));

CREATE POLICY "Staff can manage fact finds on broker leads"
  ON public.fact_find_responses FOR ALL
  USING (has_role(auth.uid(), 'broker_staff'::app_role) AND EXISTS (
    SELECT 1 FROM leads WHERE leads.id = fact_find_responses.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())
  ));

CREATE POLICY "Super admins can manage all fact finds"
  ON public.fact_find_responses FOR ALL
  USING (is_super_admin(auth.uid()));

-- Partners can view fact finds on their own leads
CREATE POLICY "Partners can view fact finds on own leads"
  ON public.fact_find_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM leads WHERE leads.id = fact_find_responses.lead_id AND leads.referral_partner_id = auth.uid()
  ));

CREATE TRIGGER update_fact_find_responses_updated_at
  BEFORE UPDATE ON public.fact_find_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Document requests: tracks what documents are needed per lead
CREATE TABLE public.document_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. 'Payslips (last 3 months)'
  description TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, uploaded, approved, rejected
  file_path TEXT NULL, -- path in storage bucket
  file_name TEXT NULL,
  file_size INTEGER NULL,
  uploaded_at TIMESTAMPTZ NULL,
  reviewed_by UUID NULL,
  reviewed_at TIMESTAMPTZ NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage document requests on own leads"
  ON public.document_requests FOR ALL
  USING (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
    SELECT 1 FROM leads WHERE leads.id = document_requests.lead_id AND leads.broker_id = auth.uid()
  ));

CREATE POLICY "Staff can manage document requests on broker leads"
  ON public.document_requests FOR ALL
  USING (has_role(auth.uid(), 'broker_staff'::app_role) AND EXISTS (
    SELECT 1 FROM leads WHERE leads.id = document_requests.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())
  ));

CREATE POLICY "Super admins can manage all document requests"
  ON public.document_requests FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Partners can view document requests on own leads"
  ON public.document_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM leads WHERE leads.id = document_requests.lead_id AND leads.referral_partner_id = auth.uid()
  ));

CREATE TRIGGER update_document_requests_updated_at
  BEFORE UPDATE ON public.document_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Client portal access tokens for public fact find links
CREATE TABLE public.client_portal_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_portal_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage portal tokens on own leads"
  ON public.client_portal_tokens FOR ALL
  USING (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
    SELECT 1 FROM leads WHERE leads.id = client_portal_tokens.lead_id AND leads.broker_id = auth.uid()
  ));

CREATE POLICY "Staff can manage portal tokens on broker leads"
  ON public.client_portal_tokens FOR ALL
  USING (has_role(auth.uid(), 'broker_staff'::app_role) AND EXISTS (
    SELECT 1 FROM leads WHERE leads.id = client_portal_tokens.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())
  ));

CREATE POLICY "Super admins can manage all portal tokens"
  ON public.client_portal_tokens FOR ALL
  USING (is_super_admin(auth.uid()));

-- Storage bucket for client documents
INSERT INTO storage.buckets (id, name, public) VALUES ('client-documents', 'client-documents', false);

-- Storage policies: brokers/staff/admins can manage files scoped to lead_id folders
CREATE POLICY "Brokers can manage own lead documents"
  ON storage.objects FOR ALL
  USING (bucket_id = 'client-documents' AND has_role(auth.uid(), 'broker'::app_role))
  WITH CHECK (bucket_id = 'client-documents' AND has_role(auth.uid(), 'broker'::app_role));

CREATE POLICY "Staff can manage broker lead documents"
  ON storage.objects FOR ALL
  USING (bucket_id = 'client-documents' AND has_role(auth.uid(), 'broker_staff'::app_role))
  WITH CHECK (bucket_id = 'client-documents' AND has_role(auth.uid(), 'broker_staff'::app_role));

CREATE POLICY "Super admins can manage all documents"
  ON storage.objects FOR ALL
  USING (bucket_id = 'client-documents' AND is_super_admin(auth.uid()))
  WITH CHECK (bucket_id = 'client-documents' AND is_super_admin(auth.uid()));
