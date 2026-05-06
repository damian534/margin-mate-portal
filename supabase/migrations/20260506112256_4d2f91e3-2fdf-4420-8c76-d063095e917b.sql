
CREATE TABLE public.task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL,
  name TEXT NOT NULL,
  task_title TEXT NOT NULL,
  due_in_days INTEGER,
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage own task templates"
ON public.task_templates FOR ALL
USING (broker_id = get_my_broker_id(auth.uid()))
WITH CHECK (broker_id = get_my_broker_id(auth.uid()));

CREATE POLICY "Super admins manage all task templates"
ON public.task_templates FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER trg_task_templates_updated_at
BEFORE UPDATE ON public.task_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.tasks
ADD COLUMN checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb;
