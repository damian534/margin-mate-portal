ALTER TABLE public.esign_fields DROP CONSTRAINT esign_fields_type_check;
ALTER TABLE public.esign_fields ADD CONSTRAINT esign_fields_type_check CHECK (field_type IN ('signature','initials','date','text','checkbox'));

CREATE POLICY "Team can delete deal scenarios" ON public.tool_scenarios FOR DELETE TO authenticated
USING (public.scenario_lead_id(inputs) IS NOT NULL AND public.can_manage_lead(public.scenario_lead_id(inputs)));

CREATE INDEX IF NOT EXISTS idx_leads_broker_created ON public.leads (broker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_referral_partner ON public.leads (referral_partner_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_broker_id ON public.profiles (broker_id);
CREATE INDEX IF NOT EXISTS idx_contacts_type_created_by ON public.contacts (type, created_by);

CREATE OR REPLACE FUNCTION public.track_stage_entered_at()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('app.status_rename', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.wip_status IS DISTINCT FROM OLD.wip_status THEN
    NEW.stage_entered_at := now();
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.rename_lead_status(_kind text, _old text, _new text)
 RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('app.status_rename', 'on', true);
  IF _kind = 'wip' THEN
    UPDATE public.leads SET wip_status = _new WHERE wip_status = _old;
  ELSE
    UPDATE public.leads SET status = _new WHERE status = _old;
  END IF;
  PERFORM set_config('app.status_rename', 'off', true);
END $$;
GRANT EXECUTE ON FUNCTION public.rename_lead_status(text, text, text) TO authenticated;