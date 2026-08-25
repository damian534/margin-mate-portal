ALTER TABLE public.lenders
  ADD COLUMN IF NOT EXISTS lmi_provider text NOT NULL DEFAULT 'generic',
  ADD COLUMN IF NOT EXISTS lmi_multiplier numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS lmi_max_lvr numeric NOT NULL DEFAULT 95,
  ADD COLUMN IF NOT EXISTS lmi_max_capitalised_lvr numeric NOT NULL DEFAULT 97,
  ADD COLUMN IF NOT EXISTS lmi_waiver_max_lvr numeric,
  ADD COLUMN IF NOT EXISTS lmi_waiver_notes text,
  ADD COLUMN IF NOT EXISTS lmi_rate_table jsonb,
  ADD COLUMN IF NOT EXISTS lmi_notes text;