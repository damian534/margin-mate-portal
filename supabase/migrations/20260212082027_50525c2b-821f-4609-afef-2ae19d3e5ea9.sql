-- Allow super admins to INSERT user_roles (for promoting users)
CREATE POLICY "Super admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

-- Allow super admins to UPDATE user_roles
CREATE POLICY "Super admins can update roles"
ON public.user_roles
FOR UPDATE
USING (is_super_admin(auth.uid()));
