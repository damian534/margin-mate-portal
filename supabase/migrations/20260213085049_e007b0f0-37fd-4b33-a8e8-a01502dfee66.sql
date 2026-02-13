-- Fix profiles INSERT policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Brokers can insert partner profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.profiles;

CREATE POLICY "Brokers can insert partner profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'broker'::app_role) AND broker_id = auth.uid());

CREATE POLICY "Super admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));