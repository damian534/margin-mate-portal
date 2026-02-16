
-- Fix infinite recursion: Staff profiles policy references profiles itself
-- Replace all staff RLS policies that use subquery on profiles with get_my_broker_id()

-- 1. Fix profiles table - the source of infinite recursion
DROP POLICY IF EXISTS "Staff can view broker profiles" ON public.profiles;
CREATE POLICY "Staff can view broker profiles" ON public.profiles
  FOR SELECT USING (
    has_role(auth.uid(), 'broker_staff'::app_role)
    AND (
      broker_id = get_my_broker_id(auth.uid())
      OR user_id = auth.uid()
    )
  );

-- 2. Fix leads staff policy
DROP POLICY IF EXISTS "Staff can manage broker leads" ON public.leads;
CREATE POLICY "Staff can manage broker leads" ON public.leads
  FOR ALL USING (
    has_role(auth.uid(), 'broker_staff'::app_role)
    AND broker_id = get_my_broker_id(auth.uid())
  ) WITH CHECK (
    has_role(auth.uid(), 'broker_staff'::app_role)
    AND broker_id = get_my_broker_id(auth.uid())
  );

-- 3. Fix settlements staff policy
DROP POLICY IF EXISTS "Staff can manage broker settlements" ON public.settlements;
CREATE POLICY "Staff can manage broker settlements" ON public.settlements
  FOR ALL USING (
    has_role(auth.uid(), 'broker_staff'::app_role)
    AND broker_id = get_my_broker_id(auth.uid())
  ) WITH CHECK (
    has_role(auth.uid(), 'broker_staff'::app_role)
    AND broker_id = get_my_broker_id(auth.uid())
  );

-- 4. Fix broker_activity staff policy
DROP POLICY IF EXISTS "Staff can manage broker activity" ON public.broker_activity;
CREATE POLICY "Staff can manage broker activity" ON public.broker_activity
  FOR ALL USING (
    has_role(auth.uid(), 'broker_staff'::app_role)
    AND broker_id = get_my_broker_id(auth.uid())
  ) WITH CHECK (
    has_role(auth.uid(), 'broker_staff'::app_role)
    AND broker_id = get_my_broker_id(auth.uid())
  );

-- 5. Fix broker_activity_targets staff policy
DROP POLICY IF EXISTS "Staff can view broker activity targets" ON public.broker_activity_targets;
CREATE POLICY "Staff can view broker activity targets" ON public.broker_activity_targets
  FOR SELECT USING (
    has_role(auth.uid(), 'broker_staff'::app_role)
    AND broker_id = get_my_broker_id(auth.uid())
  );

-- 6. Fix settlement_targets staff policy
DROP POLICY IF EXISTS "Staff can view broker settlement targets" ON public.settlement_targets;
CREATE POLICY "Staff can view broker settlement targets" ON public.settlement_targets
  FOR SELECT USING (
    has_role(auth.uid(), 'broker_staff'::app_role)
    AND broker_id = get_my_broker_id(auth.uid())
  );

-- 7. Fix contacts staff policy
DROP POLICY IF EXISTS "Staff can manage broker contacts" ON public.contacts;
CREATE POLICY "Staff can manage broker contacts" ON public.contacts
  FOR ALL USING (
    has_role(auth.uid(), 'broker_staff'::app_role)
    AND created_by = get_my_broker_id(auth.uid())
  );

-- 8. Fix notes staff policy
DROP POLICY IF EXISTS "Staff can manage notes on broker leads" ON public.notes;
CREATE POLICY "Staff can manage notes on broker leads" ON public.notes
  FOR ALL USING (
    has_role(auth.uid(), 'broker_staff'::app_role)
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = notes.lead_id
        AND leads.broker_id = get_my_broker_id(auth.uid())
    )
  );

-- 9. Fix tasks staff policy
DROP POLICY IF EXISTS "Staff can manage tasks on broker leads" ON public.tasks;
CREATE POLICY "Staff can manage tasks on broker leads" ON public.tasks
  FOR ALL USING (
    has_role(auth.uid(), 'broker_staff'::app_role)
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = tasks.lead_id
        AND leads.broker_id = get_my_broker_id(auth.uid())
    )
  );

-- 10. Also update get_my_broker_id to NOT query profiles for staff
-- (it already uses profiles but is SECURITY DEFINER so it bypasses RLS - this is fine)

-- 11. Fix null broker_id on leads - assign to the only broker
UPDATE public.leads SET broker_id = '88fa4fe4-2468-4665-8c52-a658582d78cc' WHERE broker_id IS NULL;
