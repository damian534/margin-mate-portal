CREATE OR REPLACE FUNCTION public.can_manage_lead(_lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = _lead_id
        AND (
          (public.has_role(auth.uid(), 'broker') AND l.broker_id = auth.uid())
          OR (public.has_role(auth.uid(), 'broker_staff') AND l.broker_id = public.get_my_broker_id(auth.uid()))
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_view_lead_partner(_lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = _lead_id AND l.referral_partner_id = auth.uid()
  );
$$;

CREATE TABLE public.lead_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  name text NOT NULL,
  entity_type text NOT NULL DEFAULT 'company',
  abn text,
  acn text,
  trustee_entity_id uuid REFERENCES public.lead_entities(id) ON DELETE SET NULL,
  is_applicant boolean NOT NULL DEFAULT false,
  fy_end text,
  notes text,
  position_x double precision NOT NULL DEFAULT 0,
  position_y double precision NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lead_entity_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES public.lead_entities(id) ON DELETE CASCADE,
  person_entity_id uuid REFERENCES public.lead_entities(id) ON DELETE SET NULL,
  person_name text,
  role text NOT NULL DEFAULT 'director',
  percentage numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lead_entity_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_entity_id uuid NOT NULL REFERENCES public.lead_entities(id) ON DELETE CASCADE,
  to_entity_id uuid NOT NULL REFERENCES public.lead_entities(id) ON DELETE CASCADE,
  financial_year integer NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  flow_type text NOT NULL DEFAULT 'trust_distribution',
  use_for_servicing boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_entities_lead ON public.lead_entities(lead_id);
CREATE INDEX idx_lead_entity_roles_lead ON public.lead_entity_roles(lead_id);
CREATE INDEX idx_lead_entity_flows_lead ON public.lead_entity_flows(lead_id, financial_year);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_entities TO authenticated;
GRANT ALL ON public.lead_entities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_entity_roles TO authenticated;
GRANT ALL ON public.lead_entity_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_entity_flows TO authenticated;
GRANT ALL ON public.lead_entity_flows TO service_role;

ALTER TABLE public.lead_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_entity_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_entity_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage entities on accessible leads" ON public.lead_entities
  FOR ALL TO authenticated USING (public.can_manage_lead(lead_id)) WITH CHECK (public.can_manage_lead(lead_id));
CREATE POLICY "Partners view entities on own leads" ON public.lead_entities
  FOR SELECT TO authenticated USING (public.can_view_lead_partner(lead_id));

CREATE POLICY "Manage entity roles on accessible leads" ON public.lead_entity_roles
  FOR ALL TO authenticated USING (public.can_manage_lead(lead_id)) WITH CHECK (public.can_manage_lead(lead_id));
CREATE POLICY "Partners view entity roles on own leads" ON public.lead_entity_roles
  FOR SELECT TO authenticated USING (public.can_view_lead_partner(lead_id));

CREATE POLICY "Manage entity flows on accessible leads" ON public.lead_entity_flows
  FOR ALL TO authenticated USING (public.can_manage_lead(lead_id)) WITH CHECK (public.can_manage_lead(lead_id));
CREATE POLICY "Partners view entity flows on own leads" ON public.lead_entity_flows
  FOR SELECT TO authenticated USING (public.can_view_lead_partner(lead_id));

CREATE TRIGGER trg_lead_entities_updated BEFORE UPDATE ON public.lead_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_lead_entity_roles_updated BEFORE UPDATE ON public.lead_entity_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_lead_entity_flows_updated BEFORE UPDATE ON public.lead_entity_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();