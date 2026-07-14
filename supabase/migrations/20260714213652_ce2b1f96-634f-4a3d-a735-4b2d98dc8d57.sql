
DROP POLICY IF EXISTS "Users can manage own standalone tasks" ON public.tasks;

CREATE POLICY "Users can manage own standalone tasks"
ON public.tasks FOR ALL
USING (
  lead_id IS NULL AND (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR (
      public.get_my_broker_id(auth.uid()) IS NOT NULL AND (
        public.get_my_broker_id(created_by) = public.get_my_broker_id(auth.uid())
        OR public.get_my_broker_id(assigned_to) = public.get_my_broker_id(auth.uid())
      )
    )
  )
)
WITH CHECK (
  lead_id IS NULL AND (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR (
      public.get_my_broker_id(auth.uid()) IS NOT NULL AND (
        public.get_my_broker_id(created_by) = public.get_my_broker_id(auth.uid())
        OR public.get_my_broker_id(assigned_to) = public.get_my_broker_id(auth.uid())
      )
    )
  )
);
