
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS pre_approval_purchase_price numeric,
  ADD COLUMN IF NOT EXISTS pre_approval_loan_amount numeric,
  ADD COLUMN IF NOT EXISTS pre_approval_expiry_date date,
  ADD COLUMN IF NOT EXISTS pre_approval_ftc numeric;

CREATE TABLE IF NOT EXISTS public.lead_pre_approval_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  label text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_pre_approval_conditions_lead ON public.lead_pre_approval_conditions(lead_id);

ALTER TABLE public.lead_pre_approval_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage pre-appr conds on own leads"
ON public.lead_pre_approval_conditions FOR ALL
USING (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
  SELECT 1 FROM public.leads WHERE leads.id = lead_pre_approval_conditions.lead_id AND leads.broker_id = auth.uid()))
WITH CHECK (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
  SELECT 1 FROM public.leads WHERE leads.id = lead_pre_approval_conditions.lead_id AND leads.broker_id = auth.uid()));

CREATE POLICY "Staff manage pre-appr conds on broker leads"
ON public.lead_pre_approval_conditions FOR ALL
USING (has_role(auth.uid(), 'broker_staff'::app_role) AND EXISTS (
  SELECT 1 FROM public.leads WHERE leads.id = lead_pre_approval_conditions.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())))
WITH CHECK (has_role(auth.uid(), 'broker_staff'::app_role) AND EXISTS (
  SELECT 1 FROM public.leads WHERE leads.id = lead_pre_approval_conditions.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())));

CREATE POLICY "Partners view pre-appr conds on own leads"
ON public.lead_pre_approval_conditions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_pre_approval_conditions.lead_id AND leads.referral_partner_id = auth.uid()));

CREATE POLICY "Super admins manage all pre-appr conds"
ON public.lead_pre_approval_conditions FOR ALL
USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER update_lead_pre_approval_conditions_updated_at
BEFORE UPDATE ON public.lead_pre_approval_conditions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
