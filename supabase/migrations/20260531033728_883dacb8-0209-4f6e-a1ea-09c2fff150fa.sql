CREATE TABLE public.competitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  prize TEXT NOT NULL,
  prize_amount NUMERIC,
  metric TEXT NOT NULL DEFAULT 'referrals',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitions TO authenticated;
GRANT ALL ON public.competitions TO service_role;

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage own competitions"
ON public.competitions FOR ALL
TO authenticated
USING (broker_id = auth.uid() OR broker_id = public.get_my_broker_id(auth.uid()))
WITH CHECK (broker_id = auth.uid() OR broker_id = public.get_my_broker_id(auth.uid()));

CREATE POLICY "Super admins manage all competitions"
ON public.competitions FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Partners view competitions for their company"
ON public.competitions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.company_id = competitions.company_id
  )
);

CREATE INDEX idx_competitions_broker ON public.competitions(broker_id);
CREATE INDEX idx_competitions_company ON public.competitions(company_id);
CREATE INDEX idx_competitions_active_dates ON public.competitions(is_active, start_date, end_date);

CREATE TRIGGER update_competitions_updated_at
BEFORE UPDATE ON public.competitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();