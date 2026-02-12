-- Add task_id to notes so notes can be linked to a specific task
ALTER TABLE public.notes ADD COLUMN task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Index for fast lookups
CREATE INDEX idx_notes_task_id ON public.notes(task_id);