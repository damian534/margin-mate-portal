ALTER TABLE public.broker_email_settings
  ADD COLUMN IF NOT EXISTS inbound_webhook_key text;

ALTER TABLE public.broker_email_settings
  ALTER COLUMN inbound_webhook_key SET DEFAULT gen_random_uuid()::text;

CREATE UNIQUE INDEX IF NOT EXISTS broker_email_settings_inbound_key_uidx
  ON public.broker_email_settings (inbound_webhook_key);