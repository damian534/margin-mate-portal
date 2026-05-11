
ALTER TABLE public.broker_email_settings
  ADD COLUMN IF NOT EXISTS claude_webhook_url text,
  ADD COLUMN IF NOT EXISTS claude_webhook_secret text,
  ADD COLUMN IF NOT EXISTS claude_webhook_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS claude_default_prompt text DEFAULT 'Process the inbox';
