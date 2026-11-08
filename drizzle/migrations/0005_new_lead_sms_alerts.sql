ALTER TABLE public.broker_email_settings ADD COLUMN IF NOT EXISTS sms_alerts_enabled boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS sms_alert_phone text, ADD COLUMN IF NOT EXISTS sms_sender_phone text;
CREATE TABLE public.lead_sms_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 lead_id uuid NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
 broker_id uuid NOT NULL,
 dispatch_token uuid NOT NULL DEFAULT gen_random_uuid(),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','accepted','failed','skipped')),
 provider_message_id text,
 error_details text,
 created_at timestamptz NOT NULL DEFAULT now(),
 processed_at timestamptz
);
GRANT ALL ON public.lead_sms_jobs TO service_role;
REVOKE ALL ON public.lead_sms_jobs FROM anon, authenticated;
ALTER TABLE public.lead_sms_jobs ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.queue_new_lead_sms() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE job public.lead_sms_jobs;
BEGIN
 IF NEW.broker_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.broker_email_settings WHERE broker_id = NEW.broker_id AND sms_alerts_enabled AND sms_alert_phone IS NOT NULL AND sms_sender_phone IS NOT NULL) THEN RETURN NEW; END IF;
 INSERT INTO public.lead_sms_jobs(lead_id, broker_id) VALUES (NEW.id, NEW.broker_id) ON CONFLICT (lead_id) DO NOTHING RETURNING * INTO job;
 IF job.id IS NOT NULL THEN
  PERFORM net.http_post(url := 'https://capydxuqpclcwadhwgvz.supabase.co/functions/v1/new-lead-sms', headers := jsonb_build_object('Content-Type','application/json'), body := jsonb_build_object('job_id', job.id, 'dispatch_token', job.dispatch_token), timeout_milliseconds := 15000);
 END IF;
 RETURN NEW;
EXCEPTION WHEN OTHERS THEN
 RAISE WARNING 'Could not queue new lead SMS';
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.queue_new_lead_sms() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_new_lead_sms AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.queue_new_lead_sms();