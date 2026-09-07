CREATE TABLE public.esign_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL,
  created_by uuid NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  title text NOT NULL,
  message text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  content_type text,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  completed_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.esign_signers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.esign_documents(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role_label text,
  signing_order integer NOT NULL DEFAULT 1,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  signature_path text,
  signature_type text,
  typed_name text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.esign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.esign_documents(id) ON DELETE CASCADE,
  signer_id uuid REFERENCES public.esign_signers(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  detail text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_esign_documents_lead ON public.esign_documents(lead_id);
CREATE INDEX idx_esign_documents_contact ON public.esign_documents(contact_id);
CREATE INDEX idx_esign_documents_broker ON public.esign_documents(broker_id);
CREATE INDEX idx_esign_signers_document ON public.esign_signers(document_id);
CREATE INDEX idx_esign_events_document ON public.esign_events(document_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.esign_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.esign_signers TO authenticated;
GRANT SELECT, INSERT ON public.esign_events TO authenticated;
GRANT ALL ON public.esign_documents TO service_role;
GRANT ALL ON public.esign_signers TO service_role;
GRANT ALL ON public.esign_events TO service_role;

ALTER TABLE public.esign_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esign_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esign_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_esign_document(_document_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.esign_documents d
      WHERE d.id = _document_id
        AND d.broker_id = public.get_my_broker_id(auth.uid())
    );
$$;

CREATE POLICY "Brokers manage their esign documents"
ON public.esign_documents FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()) OR broker_id = public.get_my_broker_id(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()) OR broker_id = public.get_my_broker_id(auth.uid()));

CREATE POLICY "Brokers manage their esign signers"
ON public.esign_signers FOR ALL TO authenticated
USING (public.can_access_esign_document(document_id))
WITH CHECK (public.can_access_esign_document(document_id));

CREATE POLICY "Brokers view esign events"
ON public.esign_events FOR SELECT TO authenticated
USING (public.can_access_esign_document(document_id));

CREATE POLICY "Brokers add esign events"
ON public.esign_events FOR INSERT TO authenticated
WITH CHECK (public.can_access_esign_document(document_id));

CREATE TRIGGER trg_esign_documents_updated_at BEFORE UPDATE ON public.esign_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_esign_signers_updated_at BEFORE UPDATE ON public.esign_signers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Brokers read esign files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'esign-documents');

CREATE POLICY "Brokers upload esign files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'esign-documents');