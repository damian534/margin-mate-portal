ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS proposal_sent_date date;

CREATE OR REPLACE FUNCTION public.set_proposal_sent_date()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.wip_status = 'proposal_sent' AND NEW.proposal_sent_date IS NULL
     AND (TG_OP = 'INSERT' OR OLD.wip_status IS DISTINCT FROM NEW.wip_status) THEN
    NEW.proposal_sent_date := (now() AT TIME ZONE 'Australia/Melbourne')::date;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_proposal_sent_date ON public.leads;
CREATE TRIGGER trg_set_proposal_sent_date BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_proposal_sent_date();

UPDATE public.leads l SET proposal_sent_date = sub.d
FROM (
  SELECT lead_id, min((created_at AT TIME ZONE 'Australia/Melbourne')::date) d
  FROM public.notes WHERE content LIKE '🔄 WIP stage:%→ proposal_sent%' AND lead_id IS NOT NULL
  GROUP BY lead_id
) sub
WHERE l.id = sub.lead_id AND l.proposal_sent_date IS NULL;

UPDATE public.leads SET proposal_sent_date = (stage_entered_at AT TIME ZONE 'Australia/Melbourne')::date
WHERE wip_status = 'proposal_sent' AND proposal_sent_date IS NULL AND stage_entered_at IS NOT NULL;