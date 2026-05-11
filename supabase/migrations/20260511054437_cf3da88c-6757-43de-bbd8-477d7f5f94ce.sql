CREATE OR REPLACE FUNCTION public.create_new_lead_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _creator uuid;
BEGIN
  _creator := COALESCE(NEW.broker_id, NEW.assigned_to, NEW.referral_partner_id);
  IF _creator IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.tasks (lead_id, title, description, created_by, assigned_to)
  VALUES (
    NEW.id,
    'New Lead',
    'Follow up on new lead: ' || COALESCE(NEW.opportunity_name, NULLIF(trim(coalesce(NEW.first_name,'') || ' ' || coalesce(NEW.last_name,'')), ''), 'Unnamed'),
    _creator,
    COALESCE(NEW.assigned_to, NEW.broker_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_new_lead_task ON public.leads;
CREATE TRIGGER trg_create_new_lead_task
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.create_new_lead_task();