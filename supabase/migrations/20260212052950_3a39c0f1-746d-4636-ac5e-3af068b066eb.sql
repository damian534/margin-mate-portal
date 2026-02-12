
-- Create lead_statuses configuration table
CREATE TABLE public.lead_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;

-- Brokers can manage statuses
CREATE POLICY "Brokers can do everything with lead_statuses"
  ON public.lead_statuses FOR ALL
  USING (has_role(auth.uid(), 'broker'::app_role));

-- Everyone can read statuses (partners need them for display)
CREATE POLICY "Anyone authenticated can view statuses"
  ON public.lead_statuses FOR SELECT
  TO authenticated
  USING (true);

-- Seed default statuses
INSERT INTO public.lead_statuses (name, label, color, display_order) VALUES
  ('new', 'New', '#6b7280', 0),
  ('contacted', 'Contacted', '#3b82f6', 1),
  ('in_progress', 'In Progress', '#f59e0b', 2),
  ('qualified', 'Qualified', '#8b5cf6', 3),
  ('approved', 'Approved', '#10b981', 4),
  ('settled', 'Settled', '#22c55e', 5),
  ('lost', 'Lost', '#ef4444', 6);

-- Convert leads.status from enum to text for custom status support
ALTER TABLE public.leads ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.leads ALTER COLUMN status SET DEFAULT 'new';

-- Drop the enum type (no longer needed)
DROP TYPE IF EXISTS public.lead_status;
