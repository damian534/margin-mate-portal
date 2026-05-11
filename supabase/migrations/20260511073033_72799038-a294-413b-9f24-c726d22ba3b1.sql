
CREATE TABLE public.milestone_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL,
  milestone text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(broker_id, milestone)
);

ALTER TABLE public.milestone_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Broker or super admin manages own milestone templates"
ON public.milestone_email_templates
FOR ALL
TO authenticated
USING (broker_id = auth.uid() OR public.is_super_admin(auth.uid()))
WITH CHECK (broker_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_milestone_email_templates_updated_at
BEFORE UPDATE ON public.milestone_email_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.broker_email_settings (
  broker_id uuid PRIMARY KEY,
  milestone_bcc_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.broker_email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Broker or super admin manages own email settings"
ON public.broker_email_settings
FOR ALL
TO authenticated
USING (broker_id = auth.uid() OR public.is_super_admin(auth.uid()))
WITH CHECK (broker_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_broker_email_settings_updated_at
BEFORE UPDATE ON public.broker_email_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
