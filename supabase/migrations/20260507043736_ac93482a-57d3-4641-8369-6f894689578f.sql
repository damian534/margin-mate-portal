
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS co_applicant_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS co_applicant_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_co_applicant ON public.contacts(co_applicant_contact_id);
CREATE INDEX IF NOT EXISTS idx_leads_co_applicant ON public.leads(co_applicant_contact_id);
