ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS co_applicant_contact_id_2 uuid,
  ADD COLUMN IF NOT EXISTS co_applicant_contact_id_3 uuid;