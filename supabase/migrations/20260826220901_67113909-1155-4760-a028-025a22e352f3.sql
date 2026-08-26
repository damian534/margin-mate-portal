CREATE POLICY "Anyone can read tenant branding files"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'tenant-branding');

CREATE POLICY "Tenant owners can upload branding files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-branding'
    AND (
      public.is_super_admin(auth.uid())
      OR (storage.foldername(name))[1] = public.get_my_tenant_id(auth.uid())::text
    )
  );

CREATE POLICY "Tenant owners can update branding files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tenant-branding'
    AND (
      public.is_super_admin(auth.uid())
      OR (storage.foldername(name))[1] = public.get_my_tenant_id(auth.uid())::text
    )
  );

CREATE POLICY "Tenant owners can delete branding files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant-branding'
    AND (
      public.is_super_admin(auth.uid())
      OR (storage.foldername(name))[1] = public.get_my_tenant_id(auth.uid())::text
    )
  );