
-- Add commission tracking fields to leads
ALTER TABLE public.leads
  ADD COLUMN referrer_commission numeric DEFAULT NULL,
  ADD COLUMN referrer_commission_type text DEFAULT 'on_settlement',
  ADD COLUMN referrer_commission_paid boolean DEFAULT false,
  ADD COLUMN company_commission numeric DEFAULT NULL,
  ADD COLUMN company_commission_type text DEFAULT 'on_settlement',
  ADD COLUMN company_commission_paid boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.leads.referrer_commission_type IS 'per_lead or on_settlement';
COMMENT ON COLUMN public.leads.company_commission_type IS 'per_lead or on_settlement';
