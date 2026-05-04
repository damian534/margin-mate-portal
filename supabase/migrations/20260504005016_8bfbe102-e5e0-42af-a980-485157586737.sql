-- Add original_broker_id to leads for shared visibility after handover
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS original_broker_id uuid;

-- Lead referrals table
CREATE TABLE IF NOT EXISTS public.lead_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  from_broker_id uuid NOT NULL,
  to_broker_id uuid NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending', -- pending | accepted | declined | cancelled
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_referrals_to_broker ON public.lead_referrals(to_broker_id, status);
CREATE INDEX IF NOT EXISTS idx_lead_referrals_from_broker ON public.lead_referrals(from_broker_id, status);
CREATE INDEX IF NOT EXISTS idx_lead_referrals_lead ON public.lead_referrals(lead_id);

ALTER TABLE public.lead_referrals ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_lead_referrals_updated
BEFORE UPDATE ON public.lead_referrals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Helper: does the current user have an accepted/pending referral involvement?
CREATE OR REPLACE FUNCTION public.user_has_referral_access(_user_id uuid, _lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lead_referrals
    WHERE lead_id = _lead_id
      AND (from_broker_id = _user_id OR to_broker_id = _user_id)
  )
$$;

-- RLS for lead_referrals
CREATE POLICY "Brokers create referrals for own leads"
ON public.lead_referrals FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'broker'::app_role)
  AND from_broker_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.leads WHERE id = lead_id AND broker_id = auth.uid())
);

CREATE POLICY "Involved brokers view referrals"
ON public.lead_referrals FOR SELECT TO authenticated
USING (
  from_broker_id = auth.uid()
  OR to_broker_id = auth.uid()
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Receiving broker updates referral status"
ON public.lead_referrals FOR UPDATE TO authenticated
USING (to_broker_id = auth.uid() OR from_broker_id = auth.uid() OR is_super_admin(auth.uid()))
WITH CHECK (to_broker_id = auth.uid() OR from_broker_id = auth.uid() OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage referrals"
ON public.lead_referrals FOR ALL TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Extend leads visibility: original broker keeps read-only view
CREATE POLICY "Original broker can view referred leads"
ON public.leads FOR SELECT TO authenticated
USING (original_broker_id = auth.uid());

-- Extend notes/tasks visibility for original broker
CREATE POLICY "Original broker can view notes on referred leads"
ON public.notes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.leads
  WHERE leads.id = notes.lead_id AND leads.original_broker_id = auth.uid()
));

CREATE POLICY "Original broker can view tasks on referred leads"
ON public.tasks FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.leads
  WHERE leads.id = tasks.lead_id AND leads.original_broker_id = auth.uid()
));

-- Function to accept a referral atomically
CREATE OR REPLACE FUNCTION public.accept_lead_referral(_referral_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ref RECORD;
BEGIN
  SELECT * INTO _ref FROM public.lead_referrals WHERE id = _referral_id FOR UPDATE;
  IF _ref IS NULL THEN RAISE EXCEPTION 'Referral not found'; END IF;
  IF _ref.to_broker_id <> auth.uid() AND NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _ref.status <> 'pending' THEN RAISE EXCEPTION 'Referral already %', _ref.status; END IF;

  UPDATE public.leads
    SET original_broker_id = COALESCE(original_broker_id, _ref.from_broker_id),
        broker_id = _ref.to_broker_id,
        updated_at = now()
    WHERE id = _ref.lead_id;

  UPDATE public.lead_referrals
    SET status = 'accepted', responded_at = now()
    WHERE id = _referral_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_lead_referral(_referral_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ref RECORD;
BEGIN
  SELECT * INTO _ref FROM public.lead_referrals WHERE id = _referral_id FOR UPDATE;
  IF _ref IS NULL THEN RAISE EXCEPTION 'Referral not found'; END IF;
  IF _ref.to_broker_id <> auth.uid() AND NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _ref.status <> 'pending' THEN RAISE EXCEPTION 'Referral already %', _ref.status; END IF;

  UPDATE public.lead_referrals
    SET status = 'declined', responded_at = now()
    WHERE id = _referral_id;
END;
$$;