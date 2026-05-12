
INSERT INTO storage.buckets (id, name, public) VALUES ('signature-images', 'signature-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Signature images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'signature-images');

CREATE POLICY "Users upload own signature images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'signature-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own signature images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'signature-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own signature images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'signature-images' AND auth.uid()::text = (storage.foldername(name))[1]);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_signature_image_url text;
