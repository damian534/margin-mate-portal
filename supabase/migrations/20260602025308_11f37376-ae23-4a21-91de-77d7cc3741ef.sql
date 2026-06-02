ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_sort_order double precision,
  ADD COLUMN IF NOT EXISTS wip_sort_order double precision;

CREATE INDEX IF NOT EXISTS idx_leads_lead_sort_order ON public.leads (status, lead_sort_order);
CREATE INDEX IF NOT EXISTS idx_leads_wip_sort_order ON public.leads (wip_status, wip_sort_order);