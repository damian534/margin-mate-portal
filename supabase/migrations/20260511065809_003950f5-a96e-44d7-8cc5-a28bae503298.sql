
-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('note-attachments', 'note-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Attachments table
CREATE TABLE IF NOT EXISTS public.note_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_note_attachments_note_id ON public.note_attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_note_attachments_lead_id ON public.note_attachments(lead_id);

ALTER TABLE public.note_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage attachments on own leads" ON public.note_attachments
FOR ALL USING (has_role(auth.uid(),'broker'::app_role) AND EXISTS (SELECT 1 FROM leads WHERE leads.id = note_attachments.lead_id AND leads.broker_id = auth.uid()))
WITH CHECK (has_role(auth.uid(),'broker'::app_role) AND EXISTS (SELECT 1 FROM leads WHERE leads.id = note_attachments.lead_id AND leads.broker_id = auth.uid()));

CREATE POLICY "Staff manage attachments on broker leads" ON public.note_attachments
FOR ALL USING (has_role(auth.uid(),'broker_staff'::app_role) AND EXISTS (SELECT 1 FROM leads WHERE leads.id = note_attachments.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())))
WITH CHECK (has_role(auth.uid(),'broker_staff'::app_role) AND EXISTS (SELECT 1 FROM leads WHERE leads.id = note_attachments.lead_id AND leads.broker_id = get_my_broker_id(auth.uid())));

CREATE POLICY "Super admins manage all note attachments" ON public.note_attachments
FOR ALL USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Partners view attachments on own leads" ON public.note_attachments
FOR SELECT USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = note_attachments.lead_id AND leads.referral_partner_id = auth.uid()));

-- Storage policies for the bucket. Path layout: {lead_id}/{filename}
CREATE POLICY "Brokers manage own lead note files" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'note-attachments' AND has_role(auth.uid(),'broker'::app_role) AND EXISTS (SELECT 1 FROM leads WHERE leads.id::text = (storage.foldername(name))[1] AND leads.broker_id = auth.uid()))
WITH CHECK (bucket_id = 'note-attachments' AND has_role(auth.uid(),'broker'::app_role) AND EXISTS (SELECT 1 FROM leads WHERE leads.id::text = (storage.foldername(name))[1] AND leads.broker_id = auth.uid()));

CREATE POLICY "Staff manage broker lead note files" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'note-attachments' AND has_role(auth.uid(),'broker_staff'::app_role) AND EXISTS (SELECT 1 FROM leads WHERE leads.id::text = (storage.foldername(name))[1] AND leads.broker_id = get_my_broker_id(auth.uid())))
WITH CHECK (bucket_id = 'note-attachments' AND has_role(auth.uid(),'broker_staff'::app_role) AND EXISTS (SELECT 1 FROM leads WHERE leads.id::text = (storage.foldername(name))[1] AND leads.broker_id = get_my_broker_id(auth.uid())));

CREATE POLICY "Super admins manage all note files" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'note-attachments' AND is_super_admin(auth.uid()))
WITH CHECK (bucket_id = 'note-attachments' AND is_super_admin(auth.uid()));

CREATE POLICY "Partners view note files on own leads" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'note-attachments' AND EXISTS (SELECT 1 FROM leads WHERE leads.id::text = (storage.foldername(name))[1] AND leads.referral_partner_id = auth.uid()));
