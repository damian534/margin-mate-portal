CREATE TABLE public.wip_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wip_statuses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wip_statuses TO authenticated;
GRANT ALL ON public.wip_statuses TO service_role;

ALTER TABLE public.wip_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view wip statuses"
  ON public.wip_statuses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage wip_statuses"
  ON public.wip_statuses FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Brokers can manage wip_statuses"
  ON public.wip_statuses FOR ALL USING (has_role(auth.uid(), 'broker'::app_role));

INSERT INTO public.wip_statuses (name, label, color, display_order) VALUES
  ('pending_fact_find', 'Pending Fact Find', '#cbd5e1', 0),
  ('onboarding', 'Onboarding', '#94a3b8', 1),
  ('pending_additional_docs', 'Pending Additional Documents', '#84cc16', 2),
  ('sent_for_onboarding', 'Sent for Onboarding', '#7c9eb2', 3),
  ('researching', 'Researching', '#64748b', 4),
  ('proposal_sent', 'Proposal Sent', '#0ea5e9', 5),
  ('new_application', 'New Application', '#3b82f6', 6),
  ('app_sent_signing', 'Application Sent for Signing', '#6366f1', 7),
  ('lodged', 'Lodged', '#8b5cf6', 8),
  ('preapproved', 'Preapproved', '#a855f7', 9),
  ('mir_issued', 'MIR Issued', '#f59e0b', 10),
  ('mir_resolved', 'MIR Resolved', '#eab308', 11),
  ('aip_not_lodged', 'AIP > Full Not Yet Lodged', '#f97316', 12),
  ('conditional_approval', 'Conditional Approval', '#14b8a6', 13),
  ('formal_approval', 'Formal Approval', '#10b981', 14),
  ('loan_docs_issued', 'Loan Docs Issued', '#06b6d4', 15),
  ('loan_docs_returned', 'Loan Docs Returned to Lender', '#0891b2', 16),
  ('loan_docs_certified', 'Loan Docs Certified', '#0e7490', 17),
  ('pending_settlement_conditions', 'Pending Settlement Conditions', '#d97706', 18),
  ('pending_settlement', 'Pending Settlement', '#ca8a04', 19),
  ('settled', 'Settled', '#22c55e', 20);