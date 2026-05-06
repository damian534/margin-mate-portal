ALTER TABLE public.lead_applicants 
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE public.document_requests
  ADD COLUMN IF NOT EXISTS requested_at timestamp with time zone;