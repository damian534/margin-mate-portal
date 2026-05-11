-- Professional contacts (solicitor/conveyancer/accountant) linked to leads
CREATE TABLE public.lead_professional_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  role text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, contact_id, role)
);

CREATE INDEX idx_lead_pro_contacts_lead ON public.lead_professional_contacts(lead_id);
CREATE INDEX idx_lead_pro_contacts_contact ON public.lead_professional_contacts(contact_id);

ALTER TABLE public.lead_professional_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage pro contacts on own leads"
ON public.lead_professional_contacts FOR ALL
USING (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
  SELECT 1 FROM leads WHERE leads.id = lead_professional_contacts.lead_id AND leads.broker_id = auth.uid()
))
WITH CHECK (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
  SELECT 1 FROM leads WHERE leads.id = lead_professional_contacts.lead_id AND leads.broker_id = auth.uid()
));

CREATE POLICY "Staff manage pro contacts on broker leads"
ON public.lead_professional_contacts FOR ALL
USING (has_role(auth.uid(), 'broker_staff'::app_role) AND EXISTS (
  SELECT 1 FROM leads WHERE leads.id = lead_professional_contacts.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())
))
WITH CHECK (has_role(auth.uid(), 'broker_staff'::app_role) AND EXISTS (
  SELECT 1 FROM leads WHERE leads.id = lead_professional_contacts.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())
));

CREATE POLICY "Partners view pro contacts on own leads"
ON public.lead_professional_contacts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM leads WHERE leads.id = lead_professional_contacts.lead_id AND leads.referral_partner_id = auth.uid()
));

CREATE POLICY "Super admins manage all pro contacts"
ON public.lead_professional_contacts FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER trg_lead_pro_contacts_updated
BEFORE UPDATE ON public.lead_professional_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();