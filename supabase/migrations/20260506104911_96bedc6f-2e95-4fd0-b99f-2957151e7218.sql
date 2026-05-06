ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS wip_status text;
CREATE INDEX IF NOT EXISTS idx_leads_wip_status ON public.leads(wip_status) WHERE wip_status IS NOT NULL;