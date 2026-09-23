
CREATE OR REPLACE FUNCTION public.scenario_lead_id(_inputs jsonb)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _inputs ? 'leadId'
     AND (_inputs->>'leadId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN (_inputs->>'leadId')::uuid
    ELSE NULL
  END
$$;

CREATE POLICY "Team can view deal scenarios"
ON public.tool_scenarios
FOR SELECT
TO authenticated
USING (
  public.scenario_lead_id(inputs) IS NOT NULL
  AND public.can_manage_lead(public.scenario_lead_id(inputs))
);
