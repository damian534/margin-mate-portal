CREATE TABLE public.lead_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  applicant_id uuid,
  address text NOT NULL,
  address_type text NOT NULL DEFAULT 'current',
  years_at_address numeric,
  ownership_status text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_addresses TO authenticated;
GRANT ALL ON public.lead_addresses TO service_role;
ALTER TABLE public.lead_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage addresses for own leads" ON public.lead_addresses FOR ALL TO authenticated
  USING (public.can_manage_lead(lead_id)) WITH CHECK (public.can_manage_lead(lead_id));
CREATE TRIGGER trg_lead_addresses_updated_at BEFORE UPDATE ON public.lead_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_lead_addresses_lead ON public.lead_addresses(lead_id);

CREATE TABLE public.lead_consents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  applicant_id uuid,
  consent_type text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  granted_at timestamp with time zone,
  captured_via text,
  evidence text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_consents TO authenticated;
GRANT ALL ON public.lead_consents TO service_role;
ALTER TABLE public.lead_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage consents for own leads" ON public.lead_consents FOR ALL TO authenticated
  USING (public.can_manage_lead(lead_id)) WITH CHECK (public.can_manage_lead(lead_id));
CREATE TRIGGER trg_lead_consents_updated_at BEFORE UPDATE ON public.lead_consents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_lead_consents_lead ON public.lead_consents(lead_id);

CREATE TABLE public.lead_communications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'outbound',
  channel text NOT NULL DEFAULT 'call',
  subject text,
  body text,
  participant_name text,
  participant_contact text,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  resend_id text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_communications TO authenticated;
GRANT ALL ON public.lead_communications TO service_role;
ALTER TABLE public.lead_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage communications for own leads" ON public.lead_communications FOR ALL TO authenticated
  USING (public.can_manage_lead(lead_id)) WITH CHECK (public.can_manage_lead(lead_id));
CREATE TRIGGER trg_lead_communications_updated_at BEFORE UPDATE ON public.lead_communications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_lead_communications_lead ON public.lead_communications(lead_id, occurred_at DESC);