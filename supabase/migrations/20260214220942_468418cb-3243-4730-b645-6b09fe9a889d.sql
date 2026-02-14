
-- Create settlements table
CREATE TABLE public.settlements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id uuid NOT NULL,
  lending_assistant_id uuid,
  client_name text NOT NULL,
  settlement_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  loan_amount numeric NOT NULL DEFAULT 0,
  lender text,
  application_type text,
  lead_source text,
  security_address text,
  discharge_completed boolean DEFAULT false,
  pre_settlement_check_completed boolean DEFAULT false,
  contact_name text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Future expansion columns (hidden for now)
ALTER TABLE public.settlements
  ADD COLUMN commission_earned numeric,
  ADD COLUMN upfront_commission numeric,
  ADD COLUMN trail_value numeric,
  ADD COLUMN aggregator_split numeric,
  ADD COLUMN net_to_broker numeric;

-- Enable RLS
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can manage all settlements"
ON public.settlements FOR ALL
USING (is_super_admin(auth.uid()));

-- Brokers can manage their own settlements
CREATE POLICY "Brokers can manage own settlements"
ON public.settlements FOR ALL
USING (has_role(auth.uid(), 'broker'::app_role) AND broker_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'broker'::app_role) AND broker_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_settlements_updated_at
BEFORE UPDATE ON public.settlements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create settlement targets table for super admin target tracking
CREATE TABLE public.settlement_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id uuid NOT NULL,
  target_amount numeric NOT NULL DEFAULT 0,
  target_period text NOT NULL DEFAULT 'monthly',
  target_year integer NOT NULL,
  target_month integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.settlement_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all targets"
ON public.settlement_targets FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Brokers can view own targets"
ON public.settlement_targets FOR SELECT
USING (has_role(auth.uid(), 'broker'::app_role) AND broker_id = auth.uid());

CREATE TRIGGER update_settlement_targets_updated_at
BEFORE UPDATE ON public.settlement_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
