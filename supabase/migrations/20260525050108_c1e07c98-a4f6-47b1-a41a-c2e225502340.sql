
ALTER TABLE public.milestone_email_templates
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_size bigint;

INSERT INTO storage.buckets (id, name, public)
VALUES ('milestone-attachments', 'milestone-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Brokers read own milestone attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'milestone-attachments'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] = public.get_my_broker_id(auth.uid())::text
    OR public.is_super_admin(auth.uid())
  )
);

CREATE POLICY "Brokers upload milestone attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'milestone-attachments'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_super_admin(auth.uid())
  )
);

CREATE POLICY "Brokers update own milestone attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'milestone-attachments'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_super_admin(auth.uid())
  )
);

CREATE POLICY "Brokers delete own milestone attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'milestone-attachments'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_super_admin(auth.uid())
  )
);
