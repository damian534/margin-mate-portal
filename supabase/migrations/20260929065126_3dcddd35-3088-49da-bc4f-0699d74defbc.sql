ALTER TABLE public.meeting_notes
  ADD COLUMN IF NOT EXISTS client_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_email_markdown text;