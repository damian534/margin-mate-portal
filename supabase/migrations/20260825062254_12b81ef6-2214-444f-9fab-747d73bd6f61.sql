CREATE TABLE public.contact_financials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  section text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, section)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_financials TO authenticated;
GRANT ALL ON public.contact_financials TO service_role;

ALTER TABLE public.contact_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage financials for accessible contacts"
ON public.contact_financials
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_financials.contact_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_financials.contact_id));

CREATE TRIGGER contact_financials_updated_at
BEFORE UPDATE ON public.contact_financials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();