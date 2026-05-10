-- MIR (Missing Info Request) support
ALTER TABLE public.document_requests
  ADD COLUMN IF NOT EXISTS is_mir boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mir_batch_id uuid,
  ADD COLUMN IF NOT EXISTS mir_requested_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_document_requests_mir_batch ON public.document_requests(mir_batch_id);

-- Track each MIR batch (one row per "Request MIR" send)
CREATE TABLE IF NOT EXISTS public.mir_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  requested_by uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  lender text,
  message text,
  from_email text NOT NULL,
  from_name text,
  recipient_emails text[] NOT NULL DEFAULT '{}',
  document_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mir_requests_lead ON public.mir_requests(lead_id);

ALTER TABLE public.mir_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage MIRs on own leads" ON public.mir_requests
  FOR ALL USING (
    has_role(auth.uid(), 'broker'::app_role)
    AND EXISTS (SELECT 1 FROM public.leads WHERE leads.id = mir_requests.lead_id AND leads.broker_id = auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'broker'::app_role)
    AND EXISTS (SELECT 1 FROM public.leads WHERE leads.id = mir_requests.lead_id AND leads.broker_id = auth.uid())
  );

CREATE POLICY "Staff manage MIRs on broker leads" ON public.mir_requests
  FOR ALL USING (
    has_role(auth.uid(), 'broker_staff'::app_role)
    AND EXISTS (SELECT 1 FROM public.leads WHERE leads.id = mir_requests.lead_id AND leads.broker_id = get_my_broker_id(auth.uid()))
  )
  WITH CHECK (
    has_role(auth.uid(), 'broker_staff'::app_role)
    AND EXISTS (SELECT 1 FROM public.leads WHERE leads.id = mir_requests.lead_id AND leads.broker_id = get_my_broker_id(auth.uid()))
  );

CREATE POLICY "Super admins manage all MIRs" ON public.mir_requests
  FOR ALL USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));