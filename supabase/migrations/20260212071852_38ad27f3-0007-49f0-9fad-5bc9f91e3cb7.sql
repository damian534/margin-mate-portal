
-- Add database-level constraints for input validation on leads
ALTER TABLE public.leads
  ADD CONSTRAINT leads_first_name_length CHECK (length(first_name) <= 100),
  ADD CONSTRAINT leads_last_name_length CHECK (length(last_name) <= 100),
  ADD CONSTRAINT leads_email_length CHECK (email IS NULL OR length(email) <= 255),
  ADD CONSTRAINT leads_phone_length CHECK (phone IS NULL OR length(phone) <= 30),
  ADD CONSTRAINT leads_loan_amount_range CHECK (loan_amount IS NULL OR (loan_amount >= 0 AND loan_amount <= 999999999));

-- Add constraints on contacts table too
ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_first_name_length CHECK (length(first_name) <= 100),
  ADD CONSTRAINT contacts_last_name_length CHECK (length(last_name) <= 100),
  ADD CONSTRAINT contacts_email_length CHECK (email IS NULL OR length(email) <= 255),
  ADD CONSTRAINT contacts_phone_length CHECK (phone IS NULL OR length(phone) <= 30);
