
-- Lead sources configuration table
CREATE TABLE public.lead_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can do everything with lead_sources"
  ON public.lead_sources FOR ALL
  USING (has_role(auth.uid(), 'broker'::app_role));

CREATE POLICY "Anyone authenticated can view lead_sources"
  ON public.lead_sources FOR SELECT
  USING (true);

-- Seed default lead sources
INSERT INTO public.lead_sources (name, label, display_order, is_default) VALUES
  ('referral_partner', 'Referral Partner', 1, true),
  ('google', 'Google', 2, true),
  ('existing_client', 'Existing Client', 3, true),
  ('client_referral', 'Referral from Existing Client', 4, true),
  ('instagram', 'Instagram', 5, true),
  ('facebook', 'Facebook', 6, true),
  ('direct_call', 'Direct Call', 7, true),
  ('walk_in', 'Walk In', 8, true);

-- Add source to leads
ALTER TABLE public.leads ADD COLUMN source text DEFAULT 'referral_partner';
ALTER TABLE public.leads ADD COLUMN source_contact_id uuid;

-- Contacts table for CRM
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  company text,
  type text NOT NULL DEFAULT 'client',
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can do everything with contacts"
  ON public.contacts FOR ALL
  USING (has_role(auth.uid(), 'broker'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
