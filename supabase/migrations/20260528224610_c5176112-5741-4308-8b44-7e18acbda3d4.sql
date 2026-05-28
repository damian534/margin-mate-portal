
-- Per-company engagement: notes + next-touch reminders
CREATE TABLE public.company_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  broker_id uuid NOT NULL,
  author_id uuid,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_notes TO authenticated;
GRANT ALL ON public.company_notes TO service_role;

ALTER TABLE public.company_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage own company notes" ON public.company_notes
  FOR ALL TO authenticated
  USING (broker_id = auth.uid() OR broker_id = get_my_broker_id(auth.uid()) OR is_super_admin(auth.uid()))
  WITH CHECK (broker_id = auth.uid() OR broker_id = get_my_broker_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE INDEX idx_company_notes_company ON public.company_notes(company_id, created_at DESC);

CREATE TRIGGER company_notes_updated_at
  BEFORE UPDATE ON public.company_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.company_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  broker_id uuid NOT NULL,
  created_by uuid,
  title text NOT NULL,
  due_date date NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_reminders TO authenticated;
GRANT ALL ON public.company_reminders TO service_role;

ALTER TABLE public.company_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage own company reminders" ON public.company_reminders
  FOR ALL TO authenticated
  USING (broker_id = auth.uid() OR broker_id = get_my_broker_id(auth.uid()) OR is_super_admin(auth.uid()))
  WITH CHECK (broker_id = auth.uid() OR broker_id = get_my_broker_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE INDEX idx_company_reminders_company ON public.company_reminders(company_id, due_date);

CREATE TRIGGER company_reminders_updated_at
  BEFORE UPDATE ON public.company_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
