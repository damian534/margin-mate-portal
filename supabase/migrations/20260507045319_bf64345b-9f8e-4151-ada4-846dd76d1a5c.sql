
ALTER TABLE public.lenders
  ADD COLUMN IF NOT EXISTS is_accredited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS broker_code text,
  ADD COLUMN IF NOT EXISTS login_id text,
  ADD COLUMN IF NOT EXISTS login_password text,
  ADD COLUMN IF NOT EXISTS deals_in_progress text,
  ADD COLUMN IF NOT EXISTS bdm_name text,
  ADD COLUMN IF NOT EXISTS bdm_phone text,
  ADD COLUMN IF NOT EXISTS bdm_email text,
  ADD COLUMN IF NOT EXISTS supporting_docs_email text,
  ADD COLUMN IF NOT EXISTS discharge_email text,
  ADD COLUMN IF NOT EXISTS app_pack_esign text,
  ADD COLUMN IF NOT EXISTS mortgage_docs_esign text,
  ADD COLUMN IF NOT EXISTS fastrefi_eligibility text,
  ADD COLUMN IF NOT EXISTS settlement_conditions text,
  ADD COLUMN IF NOT EXISTS progress_payments text,
  ADD COLUMN IF NOT EXISTS notes text;
