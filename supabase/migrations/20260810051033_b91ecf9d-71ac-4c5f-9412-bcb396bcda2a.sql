CREATE OR REPLACE FUNCTION public.sync_lead_settlement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _existing_id uuid;
  _client text;
  _has_settled boolean := NEW.settled_date IS NOT NULL;
  _has_estimated boolean := NEW.estimated_settlement_date IS NOT NULL;
  _target_date date;
  _target_status text;
  _broker uuid;
BEGIN
  IF NOT _has_settled AND NOT _has_estimated THEN
    RETURN NEW;
  END IF;

  IF _has_settled THEN
    _target_date := NEW.settled_date;
    _target_status := 'settled';
  ELSE
    _target_date := NEW.estimated_settlement_date;
    _target_status := 'booked';
  END IF;

  _client := NULLIF(trim(coalesce(NEW.first_name,'') || ' ' || coalesce(NEW.last_name,'')), '');
  _client := COALESCE(_client, NEW.opportunity_name, 'Lead');
  _broker := COALESCE(NEW.broker_id, auth.uid());

  SELECT id INTO _existing_id FROM public.settlements WHERE lead_id = NEW.id LIMIT 1;

  -- Adopt a manually-entered settlement for the same client instead of duplicating it
  IF _existing_id IS NULL THEN
    SELECT s.id INTO _existing_id
    FROM public.settlements s
    WHERE s.lead_id IS NULL
      AND s.broker_id IS NOT DISTINCT FROM _broker
      AND lower(trim(s.client_name)) = lower(trim(_client))
      AND abs(s.settlement_date - _target_date) <= 45
    ORDER BY abs(s.settlement_date - _target_date)
    LIMIT 1;

    IF _existing_id IS NOT NULL THEN
      UPDATE public.settlements SET lead_id = NEW.id, updated_at = now() WHERE id = _existing_id;
    END IF;
  END IF;

  IF _existing_id IS NULL THEN
    INSERT INTO public.settlements
      (lead_id, broker_id, client_name, settlement_date, status, loan_amount, lead_source)
    VALUES
      (NEW.id, _broker, _client, _target_date, _target_status,
       COALESCE(NEW.loan_amount, 0), NEW.source);
  ELSE
    UPDATE public.settlements SET
      settlement_date = CASE
        WHEN TG_OP = 'UPDATE' AND (NEW.settled_date IS DISTINCT FROM OLD.settled_date
             OR (NEW.settled_date IS NULL AND NEW.estimated_settlement_date IS DISTINCT FROM OLD.estimated_settlement_date))
          THEN _target_date
        ELSE settlement_date
      END,
      status = CASE
        WHEN TG_OP = 'UPDATE' AND NEW.settled_date IS DISTINCT FROM OLD.settled_date AND _has_settled
          THEN 'settled'
        ELSE status
      END,
      loan_amount = CASE WHEN TG_OP = 'UPDATE' AND NEW.loan_amount IS DISTINCT FROM OLD.loan_amount
        THEN COALESCE(NEW.loan_amount, 0) ELSE loan_amount END,
      client_name = CASE WHEN TG_OP = 'UPDATE'
        AND (NEW.first_name IS DISTINCT FROM OLD.first_name OR NEW.last_name IS DISTINCT FROM OLD.last_name)
        THEN _client ELSE client_name END,
      updated_at = now()
    WHERE id = _existing_id;
  END IF;

  RETURN NEW;
END;
$function$;