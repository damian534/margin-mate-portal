
CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL,
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage own templates"
ON public.document_templates
FOR ALL
TO authenticated
USING (broker_id = public.get_my_broker_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
WITH CHECK (broker_id = public.get_my_broker_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE FUNCTION public.touch_document_templates_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_document_templates_updated_at
BEFORE UPDATE ON public.document_templates
FOR EACH ROW EXECUTE FUNCTION public.touch_document_templates_updated_at();

INSERT INTO public.document_templates (broker_id, name, display_order, is_default, items)
SELECT ur.user_id, 'PAYG', 1, true, '[
  {"section":"Identity","name":"Passport (current, valid)"},
  {"section":"Identity","name":"Driver''s licence (front and back)"},
  {"section":"Identity","name":"Medicare card (current)"},
  {"section":"Income","name":"Most recent payslip"},
  {"section":"Income","name":"Previous payslip"},
  {"section":"Income","name":"2025 income statement","description":"myGov → ATO → Income statements → download as PDF"},
  {"section":"Bank Statements","name":"3 months — everyday salary account","description":"Use https://bankstatements.com.au"},
  {"section":"Bank Statements","name":"3 months — savings account","description":"Use https://bankstatements.com.au"},
  {"section":"Additional","name":"Rental income — lease agreements + last 2 years tax returns"},
  {"section":"Additional","name":"Property documents — rates notice or contract of sale"}
]'::jsonb
FROM public.user_roles ur WHERE ur.role = 'broker';

INSERT INTO public.document_templates (broker_id, name, display_order, is_default, items)
SELECT ur.user_id, 'Sole Trader', 2, true, '[
  {"section":"Tax Returns","name":"Most recent year tax return"},
  {"section":"Tax Returns","name":"Previous year tax return"},
  {"section":"Tax Returns","name":"Most recent ATO NOA (Notice of Assessment)"},
  {"section":"Tax Returns","name":"Previous year ATO NOA (Notice of Assessment)"}
]'::jsonb
FROM public.user_roles ur WHERE ur.role = 'broker';

INSERT INTO public.document_templates (broker_id, name, display_order, is_default, items)
SELECT ur.user_id, 'Company/Trust', 3, true, '[
  {"section":"Tax Returns","name":"Most recent year individual tax return"},
  {"section":"Tax Returns","name":"Previous year individual tax return"},
  {"section":"Tax Returns","name":"Most recent year company tax return"},
  {"section":"Tax Returns","name":"Previous year company tax return"},
  {"section":"Tax Returns","name":"Most recent ATO NOA (Notice of Assessment)"},
  {"section":"Tax Returns","name":"Previous year ATO NOA (Notice of Assessment)"}
]'::jsonb
FROM public.user_roles ur WHERE ur.role = 'broker';
