DROP POLICY IF EXISTS "Brokers read esign files" ON storage.objects;
DROP POLICY IF EXISTS "Brokers upload esign files" ON storage.objects;

CREATE POLICY "Brokers read own esign files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'esign-documents'
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] = public.get_my_broker_id(auth.uid())::text
  )
);

CREATE POLICY "Brokers upload own esign files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'esign-documents'
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] = public.get_my_broker_id(auth.uid())::text
  )
);

CREATE POLICY "Brokers delete own esign files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'esign-documents'
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] = public.get_my_broker_id(auth.uid())::text
  )
);

REVOKE EXECUTE ON FUNCTION public.can_access_esign_document(uuid) FROM anon;