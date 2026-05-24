
-- Tighten client-documents storage policies to verify lead ownership via the leadId folder prefix
DROP POLICY IF EXISTS "Brokers can manage own lead documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can manage broker lead documents" ON storage.objects;

CREATE POLICY "Brokers can manage own lead documents"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'client-documents'
  AND has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id::text = (storage.foldername(objects.name))[1]
      AND l.broker_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'client-documents'
  AND has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id::text = (storage.foldername(objects.name))[1]
      AND l.broker_id = auth.uid()
  )
);

CREATE POLICY "Staff can manage broker lead documents"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'client-documents'
  AND has_role(auth.uid(), 'broker_staff'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id::text = (storage.foldername(objects.name))[1]
      AND l.broker_id = get_my_broker_id(auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'client-documents'
  AND has_role(auth.uid(), 'broker_staff'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id::text = (storage.foldername(objects.name))[1]
      AND l.broker_id = get_my_broker_id(auth.uid())
  )
);

-- Restrict invite_codes SELECT to the owning broker / their staff / super admins
DROP POLICY IF EXISTS "Authenticated users can read active invite codes" ON public.invite_codes;

CREATE POLICY "Owning broker, staff, or super admin read invite codes"
ON public.invite_codes
FOR SELECT
TO authenticated
USING (
  broker_id = auth.uid()
  OR broker_id = get_my_broker_id(auth.uid())
  OR is_super_admin(auth.uid())
);

-- Lock down lenders SELECT to tenant scope (sensitive: login_id, login_password, BDM contacts)
DROP POLICY IF EXISTS "Authenticated read lenders" ON public.lenders;

CREATE POLICY "Brokers read own lenders"
ON public.lenders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'broker'::app_role)
  AND broker_id = auth.uid()
);

CREATE POLICY "Staff read broker lenders"
ON public.lenders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'broker_staff'::app_role)
  AND broker_id = get_my_broker_id(auth.uid())
);

CREATE POLICY "Super admins read all lenders"
ON public.lenders
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));
