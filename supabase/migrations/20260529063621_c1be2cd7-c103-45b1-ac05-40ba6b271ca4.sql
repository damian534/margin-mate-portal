ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER;
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON public.tasks(sort_order);