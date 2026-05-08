-- Audience tags on contacts (clients) and profiles (partners)
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS audience_tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS audience_tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_opt_out boolean NOT NULL DEFAULT false;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS email_opt_out boolean NOT NULL DEFAULT false;

-- Campaigns
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  from_name text,
  from_email text,
  audience_sources text[] NOT NULL DEFAULT '{contacts,partners}'::text[],
  audience_tags text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'draft',
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage own campaigns" ON public.email_campaigns
  FOR ALL USING (broker_id = public.get_my_broker_id(auth.uid()))
  WITH CHECK (broker_id = public.get_my_broker_id(auth.uid()));
CREATE POLICY "Super admins manage all campaigns" ON public.email_campaigns
  FOR ALL USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_email_campaigns_updated
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Sends log
CREATE TABLE IF NOT EXISTS public.email_campaign_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  broker_id uuid NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  recipient_type text NOT NULL,
  recipient_id uuid,
  status text NOT NULL DEFAULT 'pending',
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign ON public.email_campaign_sends(campaign_id);

ALTER TABLE public.email_campaign_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers view own sends" ON public.email_campaign_sends
  FOR SELECT USING (broker_id = public.get_my_broker_id(auth.uid()));
CREATE POLICY "Super admins manage all sends" ON public.email_campaign_sends
  FOR ALL USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));