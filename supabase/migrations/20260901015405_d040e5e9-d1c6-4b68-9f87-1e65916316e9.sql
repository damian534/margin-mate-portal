ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS stage_entered_at timestamptz;

UPDATE public.leads SET stage_entered_at = COALESCE(updated_at, created_at) WHERE stage_entered_at IS NULL;

ALTER TABLE public.leads ALTER COLUMN stage_entered_at SET DEFAULT now();
ALTER TABLE public.leads ALTER COLUMN stage_entered_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.track_stage_entered_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.wip_status IS DISTINCT FROM OLD.wip_status THEN
    NEW.stage_entered_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_stage_entered ON public.leads;
CREATE TRIGGER trg_leads_stage_entered
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.track_stage_entered_at();

ALTER TABLE public.lead_statuses ADD COLUMN IF NOT EXISTS amber_after_days integer NOT NULL DEFAULT 4;
ALTER TABLE public.lead_statuses ADD COLUMN IF NOT EXISTS red_after_days integer NOT NULL DEFAULT 7;

ALTER TABLE public.wip_statuses ADD COLUMN IF NOT EXISTS amber_after_days integer NOT NULL DEFAULT 4;
ALTER TABLE public.wip_statuses ADD COLUMN IF NOT EXISTS red_after_days integer NOT NULL DEFAULT 7;