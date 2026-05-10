
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS doc_reminders_paused boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.document_reminder_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  day_offset integer NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  resend_id text,
  error text
);

CREATE INDEX IF NOT EXISTS idx_doc_reminder_sends_lead ON public.document_reminder_sends(lead_id);
CREATE INDEX IF NOT EXISTS idx_doc_reminder_sends_lead_day ON public.document_reminder_sends(lead_id, day_offset);

ALTER TABLE public.document_reminder_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers view reminder sends on own leads"
  ON public.document_reminder_sends FOR SELECT
  USING (
    has_role(auth.uid(), 'broker'::app_role)
    AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = document_reminder_sends.lead_id AND l.broker_id = auth.uid())
  );

CREATE POLICY "Staff view reminder sends on broker leads"
  ON public.document_reminder_sends FOR SELECT
  USING (
    has_role(auth.uid(), 'broker_staff'::app_role)
    AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = document_reminder_sends.lead_id AND l.broker_id = get_my_broker_id(auth.uid()))
  );

CREATE POLICY "Super admins manage all reminder sends"
  ON public.document_reminder_sends FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));
