
-- Table: broker_activity (daily activity logging)
CREATE TABLE public.broker_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id uuid NOT NULL,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  outbound_calls integer NOT NULL DEFAULT 0,
  meetings_held integer NOT NULL DEFAULT 0,
  meetings_booked integer NOT NULL DEFAULT 0,
  referral_meetings_booked integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(broker_id, activity_date)
);

ALTER TABLE public.broker_activity ENABLE ROW LEVEL SECURITY;

-- Brokers can manage their own activity
CREATE POLICY "Brokers can manage own activity"
ON public.broker_activity FOR ALL
USING (has_role(auth.uid(), 'broker'::app_role) AND broker_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'broker'::app_role) AND broker_id = auth.uid());

-- Super admins can manage all activity
CREATE POLICY "Super admins can manage all activity"
ON public.broker_activity FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_broker_activity_updated_at
BEFORE UPDATE ON public.broker_activity
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Table: broker_activity_targets (weekly targets)
CREATE TABLE public.broker_activity_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id uuid NOT NULL,
  week_number integer NOT NULL,
  year integer NOT NULL,
  meetings_target_week integer NOT NULL DEFAULT 0,
  outbound_calls_target_week integer NOT NULL DEFAULT 0,
  referral_meetings_target_week integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(broker_id, week_number, year)
);

ALTER TABLE public.broker_activity_targets ENABLE ROW LEVEL SECURITY;

-- Brokers can view own targets
CREATE POLICY "Brokers can view own targets"
ON public.broker_activity_targets FOR SELECT
USING (has_role(auth.uid(), 'broker'::app_role) AND broker_id = auth.uid());

-- Super admins can manage all targets
CREATE POLICY "Super admins can manage all targets"
ON public.broker_activity_targets FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_broker_activity_targets_updated_at
BEFORE UPDATE ON public.broker_activity_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
