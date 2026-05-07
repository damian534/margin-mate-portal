
CREATE TABLE public.google_calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  google_email text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  scope text NOT NULL,
  calendar_id text NOT NULL DEFAULT 'primary',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own google calendar connection"
  ON public.google_calendar_connections FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins manage all google calendar connections"
  ON public.google_calendar_connections FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER trg_gcc_updated_at
  BEFORE UPDATE ON public.google_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.lead_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  user_id uuid NOT NULL,
  google_event_id text NOT NULL,
  calendar_id text NOT NULL DEFAULT 'primary',
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  attendees jsonb DEFAULT '[]'::jsonb,
  location text,
  meeting_link text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lce_lead ON public.lead_calendar_events(lead_id);
CREATE INDEX idx_lce_user ON public.lead_calendar_events(user_id);

ALTER TABLE public.lead_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage events on own leads"
  ON public.lead_calendar_events FOR ALL
  USING (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
    SELECT 1 FROM leads WHERE leads.id = lead_calendar_events.lead_id AND leads.broker_id = auth.uid()
  ))
  WITH CHECK (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
    SELECT 1 FROM leads WHERE leads.id = lead_calendar_events.lead_id AND leads.broker_id = auth.uid()
  ));

CREATE POLICY "Staff manage events on broker leads"
  ON public.lead_calendar_events FOR ALL
  USING (has_role(auth.uid(), 'broker_staff'::app_role) AND EXISTS (
    SELECT 1 FROM leads WHERE leads.id = lead_calendar_events.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())
  ))
  WITH CHECK (has_role(auth.uid(), 'broker_staff'::app_role) AND EXISTS (
    SELECT 1 FROM leads WHERE leads.id = lead_calendar_events.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())
  ));

CREATE POLICY "Super admins manage all calendar events"
  ON public.lead_calendar_events FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER trg_lce_updated_at
  BEFORE UPDATE ON public.lead_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
