
-- Tool visibility settings managed by super admins
CREATE TABLE public.tool_visibility (
  tool_id TEXT PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.tool_visibility ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated users can read tool visibility"
  ON public.tool_visibility FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only super admins can update
CREATE POLICY "Super admins can update tool visibility"
  ON public.tool_visibility FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

-- Only super admins can insert
CREATE POLICY "Super admins can insert tool visibility"
  ON public.tool_visibility FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Seed all tools as enabled
INSERT INTO public.tool_visibility (tool_id, is_enabled) VALUES
  ('sell-upgrade-simulator', true),
  ('loan-repayment', true),
  ('borrowing-power', true),
  ('refinance-savings', true),
  ('buyer-readiness', true),
  ('auction-checklist', true),
  ('private-sale-checklist', true),
  ('pre-approval-tracker', true),
  ('vendor-fallover', true);
