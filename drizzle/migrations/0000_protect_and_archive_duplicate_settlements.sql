CREATE TABLE public.settlement_duplicate_archive (
  original_id uuid PRIMARY KEY,
  retained_id uuid NOT NULL,
  original_record jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL
);
GRANT ALL ON public.settlement_duplicate_archive TO service_role;
ALTER TABLE public.settlement_duplicate_archive ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.settlement_duplicate_archive IS 'Service-only recovery archive for confirmed duplicate settlements. No client access.';

CREATE OR REPLACE FUNCTION public.reject_unlinked_duplicate_settlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.lead_id IS NULL AND EXISTS (
    SELECT 1 FROM public.settlements s
    WHERE s.lead_id IS NOT NULL
      AND s.broker_id = NEW.broker_id
      AND lower(trim(s.client_name)) = lower(trim(NEW.client_name))
      AND s.settlement_date = NEW.settlement_date
      AND s.loan_amount = NEW.loan_amount
  ) THEN
    RAISE EXCEPTION 'This deal already has a settlement. Edit its existing settlement instead.' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_reject_unlinked_duplicate_settlement
BEFORE INSERT ON public.settlements
FOR EACH ROW EXECUTE FUNCTION public.reject_unlinked_duplicate_settlement();

CREATE OR REPLACE FUNCTION public.sync_lead_settlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _existing_id uuid;
  _client text;
  _target_date date;
  _target_status text;
  _broker uuid;
  _contact_name text;
BEGIN
  IF NEW.settled_date IS NULL AND NEW.estimated_settlement_date IS NULL THEN RETURN NEW; END IF;
  _target_date := COALESCE(NEW.settled_date, NEW.estimated_settlement_date);
  _target_status := CASE WHEN NEW.settled_date IS NOT NULL THEN 'settled' ELSE 'booked' END;
  _client := COALESCE(NULLIF(trim(coalesce(NEW.first_name,'') || ' ' || coalesce(NEW.last_name,'')), ''), NEW.opportunity_name, 'Lead');
  _broker := COALESCE(NEW.broker_id, auth.uid());
  SELECT NULLIF(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), '') INTO _contact_name
    FROM public.contacts WHERE id = NEW.source_contact_id;
  SELECT id INTO _existing_id FROM public.settlements WHERE lead_id = NEW.id;
  IF _existing_id IS NULL THEN
    -- Only adopt an exact, unambiguously matching manual record; never a nearby different loan.
    SELECT min(s.id::text)::uuid INTO _existing_id FROM public.settlements s
    WHERE s.lead_id IS NULL AND s.broker_id = _broker
      AND lower(trim(s.client_name)) = lower(trim(_client))
      AND s.settlement_date = _target_date
      AND s.loan_amount = COALESCE(NEW.loan_amount, 0)
    HAVING count(*) = 1;
    IF _existing_id IS NOT NULL THEN
      UPDATE public.settlements SET lead_id = NEW.id, updated_at = now() WHERE id = _existing_id;
    END IF;
  END IF;
  IF _existing_id IS NULL THEN
    INSERT INTO public.settlements (lead_id, broker_id, client_name, settlement_date, status, loan_amount, lead_source, contact_name)
    VALUES (NEW.id, _broker, _client, _target_date, _target_status, COALESCE(NEW.loan_amount, 0), NEW.source, _contact_name)
    ON CONFLICT (lead_id) WHERE lead_id IS NOT NULL DO NOTHING;
  ELSE
    UPDATE public.settlements SET
      settlement_date = CASE WHEN TG_OP = 'UPDATE' AND
        (NEW.settled_date IS DISTINCT FROM OLD.settled_date OR
        (NEW.settled_date IS NULL AND NEW.estimated_settlement_date IS DISTINCT FROM OLD.estimated_settlement_date))
        THEN _target_date ELSE settlement_date END,
      status = CASE WHEN TG_OP = 'UPDATE' AND NEW.settled_date IS DISTINCT FROM OLD.settled_date AND NEW.settled_date IS NOT NULL
        THEN 'settled' ELSE status END,
      loan_amount = CASE WHEN TG_OP = 'UPDATE' AND NEW.loan_amount IS DISTINCT FROM OLD.loan_amount
        THEN COALESCE(NEW.loan_amount, 0) ELSE loan_amount END,
      client_name = CASE WHEN TG_OP = 'UPDATE' AND
        (NEW.first_name IS DISTINCT FROM OLD.first_name OR NEW.last_name IS DISTINCT FROM OLD.last_name)
        THEN _client ELSE client_name END,
      contact_name = COALESCE(contact_name, _contact_name),
      updated_at = now()
    WHERE id = _existing_id;
  END IF;
  RETURN NEW;
END;
$$;