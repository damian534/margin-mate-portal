CREATE TABLE public.esign_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.esign_documents(id) ON DELETE CASCADE,
  signer_id uuid REFERENCES public.esign_signers(id) ON DELETE CASCADE,
  field_type text NOT NULL DEFAULT 'signature',
  page_number integer NOT NULL DEFAULT 1,
  x_pct numeric NOT NULL,
  y_pct numeric NOT NULL,
  width_pct numeric NOT NULL DEFAULT 0.22,
  height_pct numeric NOT NULL DEFAULT 0.05,
  required boolean NOT NULL DEFAULT true,
  label text,
  value text,
  filled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT esign_fields_type_check CHECK (field_type IN ('signature','initials','date','text'))
);

CREATE INDEX idx_esign_fields_document ON public.esign_fields(document_id);
CREATE INDEX idx_esign_fields_signer ON public.esign_fields(signer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.esign_fields TO authenticated;
GRANT ALL ON public.esign_fields TO service_role;

ALTER TABLE public.esign_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Broker side can manage esign fields"
ON public.esign_fields FOR ALL TO authenticated
USING (public.can_access_esign_document(document_id))
WITH CHECK (public.can_access_esign_document(document_id));

CREATE TRIGGER update_esign_fields_updated_at
BEFORE UPDATE ON public.esign_fields
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();