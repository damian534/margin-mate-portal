CREATE POLICY "Broker staff can manage wip_statuses"
ON public.wip_statuses
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'broker_staff'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'broker_staff'::public.app_role));