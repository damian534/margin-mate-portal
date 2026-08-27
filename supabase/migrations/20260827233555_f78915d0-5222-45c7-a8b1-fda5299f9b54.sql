CREATE POLICY "Staff can manage broker activity targets"
ON public.broker_activity_targets
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'broker_staff'::app_role) AND broker_id = get_my_broker_id(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'broker_staff'::app_role) AND broker_id = get_my_broker_id(auth.uid()));