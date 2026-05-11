DROP POLICY IF EXISTS "Staff can view broker profiles" ON public.profiles;

CREATE POLICY "Staff can view broker team profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'broker_staff'::app_role)
  AND get_my_broker_id(auth.uid()) IS NOT NULL
  AND (
    broker_id = get_my_broker_id(auth.uid())
    OR user_id = auth.uid()
    OR user_id = get_my_broker_id(auth.uid())
  )
);