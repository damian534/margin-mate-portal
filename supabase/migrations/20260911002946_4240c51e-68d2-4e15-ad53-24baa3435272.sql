-- Allow platform owners and super admins to manage any tenant's branding files
DROP POLICY IF EXISTS "Tenant owners can upload branding files" ON storage.objects;
CREATE POLICY "Tenant owners and platform owners can upload branding files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-branding'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_platform_owner(auth.uid())
      OR (storage.foldername(name))[1] = public.get_my_tenant_id(auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "Tenant owners can update branding files" ON storage.objects;
CREATE POLICY "Tenant owners and platform owners can update branding files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tenant-branding'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_platform_owner(auth.uid())
      OR (storage.foldername(name))[1] = public.get_my_tenant_id(auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "Tenant owners can delete branding files" ON storage.objects;
CREATE POLICY "Tenant owners and platform owners can delete branding files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant-branding'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_platform_owner(auth.uid())
      OR (storage.foldername(name))[1] = public.get_my_tenant_id(auth.uid())::text
    )
  );

-- Allow platform owners to update any tenant's branding row (super admins already can)
CREATE POLICY "Platform owners can manage tenant branding"
  ON public.tenants FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.is_platform_owner(auth.uid())
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.is_platform_owner(auth.uid())
  );