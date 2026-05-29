ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority INTEGER;
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(assigned_to, due_date, priority);