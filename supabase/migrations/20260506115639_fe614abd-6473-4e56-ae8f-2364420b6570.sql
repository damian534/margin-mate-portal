ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lodged_date date,
  ADD COLUMN IF NOT EXISTS approved_date date,
  ADD COLUMN IF NOT EXISTS settled_date date;