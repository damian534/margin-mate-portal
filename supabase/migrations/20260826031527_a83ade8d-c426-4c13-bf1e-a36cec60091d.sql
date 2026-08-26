CREATE OR REPLACE FUNCTION public.can_access_contact(_contact_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = _contact_id
        AND (
          (public.has_role(auth.uid(), 'broker') AND c.created_by = auth.uid())
          OR (public.has_role(auth.uid(), 'broker_staff') AND c.created_by = public.get_my_broker_id(auth.uid()))
        )
    );
$$;

DROP POLICY IF EXISTS "Manage financials for accessible contacts" ON public.contact_financials;

CREATE POLICY "Manage financials for owned contacts"
ON public.contact_financials
FOR ALL
TO authenticated
USING (public.can_access_contact(contact_id))
WITH CHECK (public.can_access_contact(contact_id));