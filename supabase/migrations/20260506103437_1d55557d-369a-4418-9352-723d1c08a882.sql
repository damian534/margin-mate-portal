ALTER TABLE public.client_portal_tokens
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_send_mode text,
  ADD COLUMN IF NOT EXISTS last_send_error text,
  ADD COLUMN IF NOT EXISTS send_count integer NOT NULL DEFAULT 0;