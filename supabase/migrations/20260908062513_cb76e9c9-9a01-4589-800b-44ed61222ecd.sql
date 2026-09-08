
-- One deal chat per deal + fast lookup
CREATE INDEX IF NOT EXISTS idx_conversations_deal_id ON public.conversations(deal_id) WHERE deal_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_deal_chat ON public.conversations(deal_id) WHERE type = 'deal'::public.conversation_type;

-- Deal chat visibility inherits deal permission
CREATE OR REPLACE FUNCTION public.can_view_conversation(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation_id
      AND (
        public.is_conversation_member(_conversation_id, _user_id)
        OR (c.type = 'channel' AND c.is_private = false
            AND c.organisation_id = public.get_my_tenant_id(_user_id))
        OR (c.type = 'deal' AND c.deal_id IS NOT NULL
            AND _user_id = auth.uid()
            AND public.can_manage_lead(c.deal_id))
      )
  )
$$;

-- Opens (or lazily creates) the single chat attached to a deal
CREATE OR REPLACE FUNCTION public.get_or_create_deal_conversation(_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _conversation_id uuid;
  _lead public.leads%ROWTYPE;
  _tenant_id uuid;
  _name text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in';
  END IF;
  IF NOT public.can_manage_lead(_lead_id) THEN
    RAISE EXCEPTION 'You do not have access to this deal';
  END IF;

  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal not found';
  END IF;

  SELECT id INTO _conversation_id
  FROM public.conversations
  WHERE type = 'deal'::public.conversation_type AND deal_id = _lead_id;

  IF _conversation_id IS NULL THEN
    SELECT p.tenant_id INTO _tenant_id
    FROM public.profiles p WHERE p.user_id = COALESCE(_lead.broker_id, _user_id) LIMIT 1;
    _tenant_id := COALESCE(_tenant_id, public.get_my_tenant_id(_user_id));

    _name := NULLIF(btrim(
      COALESCE(NULLIF(btrim(_lead.last_name), ''), NULLIF(btrim(_lead.first_name), ''), 'Deal')
      || CASE WHEN NULLIF(btrim(_lead.loan_purpose), '') IS NOT NULL
              THEN ' — ' || _lead.loan_purpose ELSE '' END), '');

    INSERT INTO public.conversations (organisation_id, type, name, is_private, deal_id, created_by)
    VALUES (_tenant_id, 'deal'::public.conversation_type, _name, true, _lead_id, _user_id)
    RETURNING id INTO _conversation_id;
  END IF;

  -- Deal team: assigned broker, assigned team member, brokerage support staff, and the caller
  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  SELECT _conversation_id, u, 'member'::public.conversation_member_role
  FROM (
    SELECT DISTINCT x AS u FROM unnest(ARRAY[_lead.broker_id, _lead.assigned_to, _user_id]) x
    WHERE x IS NOT NULL
    UNION
    SELECT p.user_id FROM public.profiles p
    WHERE p.user_id IS NOT NULL
      AND p.broker_id = _lead.broker_id
      AND public.has_role(p.user_id, 'broker_staff'::public.app_role)
  ) team
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN _conversation_id;
END;
$$;

-- Posts a system message into a deal's chat, only if the chat already exists
CREATE OR REPLACE FUNCTION public.post_deal_system_message(_lead_id uuid, _body text, _metadata jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conversation_id uuid;
BEGIN
  SELECT id INTO _conversation_id FROM public.conversations
  WHERE type = 'deal'::public.conversation_type AND deal_id = _lead_id;
  IF _conversation_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.messages (conversation_id, sender_id, body, message_type, metadata)
  VALUES (_conversation_id, NULL, _body, 'system'::public.chat_message_type, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.deal_chat_lifecycle_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.post_deal_system_message(NEW.id,
      'Status changed from ' || COALESCE(OLD.status, '—') || ' to ' || COALESCE(NEW.status, '—'),
      jsonb_build_object('event_type', 'deal_status_changed', 'old_status', OLD.status, 'new_status', NEW.status));
  END IF;

  IF NEW.wip_status IS DISTINCT FROM OLD.wip_status THEN
    PERFORM public.post_deal_system_message(NEW.id,
      'Stage changed from ' || COALESCE(OLD.wip_status, '—') || ' to ' || COALESCE(NEW.wip_status, '—'),
      jsonb_build_object('event_type', 'deal_stage_changed', 'old_stage', OLD.wip_status, 'new_stage', NEW.wip_status));
  END IF;

  IF NEW.lodged_date IS DISTINCT FROM OLD.lodged_date AND NEW.lodged_date IS NOT NULL THEN
    PERFORM public.post_deal_system_message(NEW.id,
      'Application lodged on ' || to_char(NEW.lodged_date, 'DD Mon YYYY'),
      jsonb_build_object('event_type', 'deal_lodged', 'lodged_date', NEW.lodged_date));
  END IF;

  IF NEW.approved_date IS DISTINCT FROM OLD.approved_date AND NEW.approved_date IS NOT NULL THEN
    PERFORM public.post_deal_system_message(NEW.id,
      'Formal approval received on ' || to_char(NEW.approved_date, 'DD Mon YYYY'),
      jsonb_build_object('event_type', 'deal_approved', 'approved_date', NEW.approved_date));
  END IF;

  IF NEW.settled_date IS DISTINCT FROM OLD.settled_date AND NEW.settled_date IS NOT NULL THEN
    PERFORM public.post_deal_system_message(NEW.id,
      'Deal settled on ' || to_char(NEW.settled_date, 'DD Mon YYYY'),
      jsonb_build_object('event_type', 'deal_settled', 'settled_date', NEW.settled_date));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deal_chat_lifecycle ON public.leads;
CREATE TRIGGER trg_deal_chat_lifecycle
AFTER UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.deal_chat_lifecycle_events();
