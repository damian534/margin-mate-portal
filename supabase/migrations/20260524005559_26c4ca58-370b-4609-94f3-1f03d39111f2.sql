
CREATE TABLE public.meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  broker_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Meeting',
  meeting_date date NOT NULL DEFAULT CURRENT_DATE,
  transcript text,
  summary_markdown text,
  summary_status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_meeting_notes_lead ON public.meeting_notes(lead_id);
CREATE INDEX idx_meeting_notes_broker ON public.meeting_notes(broker_id);

ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage meeting notes on own leads"
ON public.meeting_notes FOR ALL
USING (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
  SELECT 1 FROM leads WHERE leads.id = meeting_notes.lead_id AND leads.broker_id = auth.uid()
))
WITH CHECK (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
  SELECT 1 FROM leads WHERE leads.id = meeting_notes.lead_id AND leads.broker_id = auth.uid()
));

CREATE POLICY "Staff manage meeting notes on broker leads"
ON public.meeting_notes FOR ALL
USING (has_role(auth.uid(), 'broker_staff'::app_role) AND EXISTS (
  SELECT 1 FROM leads WHERE leads.id = meeting_notes.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())
))
WITH CHECK (has_role(auth.uid(), 'broker_staff'::app_role) AND EXISTS (
  SELECT 1 FROM leads WHERE leads.id = meeting_notes.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())
));

CREATE POLICY "Partners view meeting notes on own leads"
ON public.meeting_notes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM leads WHERE leads.id = meeting_notes.lead_id AND leads.referral_partner_id = auth.uid()
));

CREATE POLICY "Super admins manage all meeting notes"
ON public.meeting_notes FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER update_meeting_notes_updated_at
BEFORE UPDATE ON public.meeting_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
