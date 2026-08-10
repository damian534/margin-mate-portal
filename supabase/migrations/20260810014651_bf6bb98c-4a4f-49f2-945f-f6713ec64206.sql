CREATE POLICY "Super admins can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Brokers can delete their partner profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'broker'::app_role)
  AND broker_id = auth.uid()
  AND user_id IS DISTINCT FROM auth.uid()
);