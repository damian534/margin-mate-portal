
-- Add columns to email_campaign_sends
ALTER TABLE public.email_campaign_sends
  ADD COLUMN IF NOT EXISTS resend_id text,
  ADD COLUMN IF NOT EXISTS unsubscribe_token text UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex');

CREATE INDEX IF NOT EXISTS idx_email_campaign_sends_resend_id ON public.email_campaign_sends(resend_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_sends_campaign ON public.email_campaign_sends(campaign_id);

-- Auto-suppress toggle
ALTER TABLE public.broker_email_settings
  ADD COLUMN IF NOT EXISTS auto_suppress_bounces boolean NOT NULL DEFAULT true;

-- Email events
CREATE TABLE IF NOT EXISTS public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id uuid REFERENCES public.email_campaign_sends(id) ON DELETE CASCADE,
  campaign_id uuid,
  broker_id uuid NOT NULL,
  recipient_email text NOT NULL,
  event_type text NOT NULL, -- delivered, opened, clicked, bounced, complained, unsubscribed, failed
  link_url text,
  user_agent text,
  ip_address text,
  metadata jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON public.email_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_events_send ON public.email_events(send_id);
CREATE INDEX IF NOT EXISTS idx_email_events_broker_type ON public.email_events(broker_id, event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_occurred ON public.email_events(occurred_at DESC);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers view own email events" ON public.email_events
  FOR SELECT USING (broker_id = get_my_broker_id(auth.uid()));
CREATE POLICY "Super admins manage email events" ON public.email_events
  FOR ALL USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Suppressions
CREATE TABLE IF NOT EXISTS public.email_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL,
  email text NOT NULL,
  reason text NOT NULL, -- bounce, complaint, unsubscribe, manual
  source_campaign_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broker_id, email)
);

CREATE INDEX IF NOT EXISTS idx_email_suppressions_broker_email ON public.email_suppressions(broker_id, lower(email));

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage own suppressions" ON public.email_suppressions
  FOR ALL USING (broker_id = get_my_broker_id(auth.uid()))
  WITH CHECK (broker_id = get_my_broker_id(auth.uid()));
CREATE POLICY "Super admins manage suppressions" ON public.email_suppressions
  FOR ALL USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
