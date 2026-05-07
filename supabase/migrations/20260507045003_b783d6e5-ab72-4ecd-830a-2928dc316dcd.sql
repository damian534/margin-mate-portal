
-- Lenders table (per broker)
CREATE TABLE public.lenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broker_id, name)
);
CREATE INDEX idx_lenders_broker ON public.lenders(broker_id);

ALTER TABLE public.lenders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage own lenders" ON public.lenders
  FOR ALL USING (has_role(auth.uid(), 'broker'::app_role) AND broker_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'broker'::app_role) AND broker_id = auth.uid());

CREATE POLICY "Staff manage broker lenders" ON public.lenders
  FOR ALL USING (has_role(auth.uid(), 'broker_staff'::app_role) AND broker_id = get_my_broker_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'broker_staff'::app_role) AND broker_id = get_my_broker_id(auth.uid()));

CREATE POLICY "Super admins manage all lenders" ON public.lenders
  FOR ALL USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Authenticated read lenders" ON public.lenders
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_lenders_updated_at
  BEFORE UPDATE ON public.lenders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Loan splits table
CREATE TABLE public.loan_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  amount numeric,
  security_address text,
  lender text,
  application_id text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_loan_splits_lead ON public.loan_splits(lead_id);

ALTER TABLE public.loan_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage splits on own leads" ON public.loan_splits
  FOR ALL USING (
    has_role(auth.uid(), 'broker'::app_role)
    AND EXISTS (SELECT 1 FROM leads WHERE leads.id = loan_splits.lead_id AND leads.broker_id = auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'broker'::app_role)
    AND EXISTS (SELECT 1 FROM leads WHERE leads.id = loan_splits.lead_id AND leads.broker_id = auth.uid())
  );

CREATE POLICY "Staff manage splits on broker leads" ON public.loan_splits
  FOR ALL USING (
    has_role(auth.uid(), 'broker_staff'::app_role)
    AND EXISTS (SELECT 1 FROM leads WHERE leads.id = loan_splits.lead_id AND leads.broker_id = get_my_broker_id(auth.uid()))
  )
  WITH CHECK (
    has_role(auth.uid(), 'broker_staff'::app_role)
    AND EXISTS (SELECT 1 FROM leads WHERE leads.id = loan_splits.lead_id AND leads.broker_id = get_my_broker_id(auth.uid()))
  );

CREATE POLICY "Partners view splits on own leads" ON public.loan_splits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM leads WHERE leads.id = loan_splits.lead_id AND leads.referral_partner_id = auth.uid())
  );

CREATE POLICY "Super admins manage all splits" ON public.loan_splits
  FOR ALL USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER trg_loan_splits_updated_at
  BEFORE UPDATE ON public.loan_splits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed lenders for each existing broker
INSERT INTO public.lenders (broker_id, name, display_order)
SELECT ur.user_id, lender_name, ord
FROM public.user_roles ur
CROSS JOIN (
  VALUES
    ('CBA', 0), ('Westpac', 1), ('ANZ', 2), ('NAB', 3), ('Macquarie', 4),
    ('ING', 5), ('Bankwest', 6), ('Suncorp', 7), ('Bank of Queensland', 8),
    ('AMP', 9), ('St George', 10), ('Bendigo Bank', 11), ('Heritage', 12),
    ('Pepper Money', 13), ('Liberty', 14), ('Resimac', 15), ('La Trobe', 16),
    ('Latitude', 17), ('Firstmac', 18), ('MyState', 19)
) AS seed(lender_name, ord)
WHERE ur.role IN ('broker', 'super_admin')
ON CONFLICT (broker_id, name) DO NOTHING;
