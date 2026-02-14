
-- Create tool_scenarios table for storing simulator runs
CREATE TABLE public.tool_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tool_name TEXT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tool_scenarios ENABLE ROW LEVEL SECURITY;

-- Users can view their own scenarios
CREATE POLICY "Users can view own scenarios"
ON public.tool_scenarios FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own scenarios
CREATE POLICY "Users can insert own scenarios"
ON public.tool_scenarios FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own scenarios
CREATE POLICY "Users can delete own scenarios"
ON public.tool_scenarios FOR DELETE
USING (auth.uid() = user_id);

-- Brokers can view all scenarios
CREATE POLICY "Brokers can view all scenarios"
ON public.tool_scenarios FOR SELECT
USING (has_role(auth.uid(), 'broker'::app_role));

-- Super admins can do everything
CREATE POLICY "Super admins can manage all scenarios"
ON public.tool_scenarios FOR ALL
USING (is_super_admin(auth.uid()));
