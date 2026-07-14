
CREATE TABLE public.document_request_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_request_id uuid NOT NULL REFERENCES public.document_requests(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  content_type text,
  uploaded_by_client boolean NOT NULL DEFAULT false,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_request_files_req ON public.document_request_files(document_request_id);
CREATE INDEX idx_document_request_files_lead ON public.document_request_files(lead_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_request_files TO authenticated;
GRANT ALL ON public.document_request_files TO service_role;

ALTER TABLE public.document_request_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage files on own leads"
ON public.document_request_files FOR ALL
USING (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
  SELECT 1 FROM public.leads l WHERE l.id = document_request_files.lead_id AND l.broker_id = auth.uid()
))
WITH CHECK (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
  SELECT 1 FROM public.leads l WHERE l.id = document_request_files.lead_id AND l.broker_id = auth.uid()
));

CREATE POLICY "Staff can manage files on broker leads"
ON public.document_request_files FOR ALL
USING (has_role(auth.uid(), 'broker_staff'::app_role) AND EXISTS (
  SELECT 1 FROM public.leads l WHERE l.id = document_request_files.lead_id AND l.broker_id = get_my_broker_id(auth.uid())
))
WITH CHECK (has_role(auth.uid(), 'broker_staff'::app_role) AND EXISTS (
  SELECT 1 FROM public.leads l WHERE l.id = document_request_files.lead_id AND l.broker_id = get_my_broker_id(auth.uid())
));

CREATE POLICY "Partners can view files on own leads"
ON public.document_request_files FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.leads l WHERE l.id = document_request_files.lead_id AND l.referral_partner_id = auth.uid()
));

CREATE POLICY "Super admins manage all files"
ON public.document_request_files FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Backfill existing single-file uploads
INSERT INTO public.document_request_files (document_request_id, lead_id, file_path, file_name, file_size, uploaded_at, uploaded_by_client)
SELECT id, lead_id, file_path, COALESCE(file_name, split_part(file_path, '/', -1)), file_size, COALESCE(uploaded_at, now()), false
FROM public.document_requests
WHERE file_path IS NOT NULL;
