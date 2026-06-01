-- Allow tasks without a lead (e.g. personal to-dos like "Book dinner")
ALTER TABLE public.tasks ALTER COLUMN lead_id DROP NOT NULL;

-- Add policies covering tasks that have NO lead — scoped to creator/assignee
CREATE POLICY "Users can manage own standalone tasks"
ON public.tasks
FOR ALL
TO authenticated
USING (lead_id IS NULL AND (created_by = auth.uid() OR assigned_to = auth.uid()))
WITH CHECK (lead_id IS NULL AND (created_by = auth.uid() OR assigned_to = auth.uid()));
