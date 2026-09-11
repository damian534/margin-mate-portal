CREATE OR REPLACE FUNCTION public.create_chat_conversation(_type conversation_type, _name text DEFAULT NULL::text, _description text DEFAULT NULL::text, _is_private boolean DEFAULT true, _member_ids uuid[] DEFAULT ARRAY[]::uuid[], _deal_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _tenant_id uuid;
  _conversation_id uuid;
  _member_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in';
  END IF;

  IF _type NOT IN ('direct'::public.conversation_type, 'group'::public.conversation_type, 'channel'::public.conversation_type) THEN
    RAISE EXCEPTION 'Unsupported conversation type';
  END IF;

  IF NOT (
    public.has_role(_user_id, 'broker'::public.app_role)
    OR public.has_role(_user_id, 'broker_staff'::public.app_role)
    OR public.has_role(_user_id, 'super_admin'::public.app_role)
    OR public.has_role(_user_id, 'platform_owner'::public.app_role)
    OR public.has_role(_user_id, 'tenant_owner'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Only brokers, support staff and administrators can use chat';
  END IF;

  _tenant_id := public.get_my_tenant_id(_user_id);
  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'Your account is not linked to a brokerage';
  END IF;

  FOREACH _member_id IN ARRAY COALESCE(_member_ids, ARRAY[]::uuid[])
  LOOP
    IF _member_id = _user_id THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = _member_id
        AND p.tenant_id = _tenant_id
    ) OR NOT (
      public.has_role(_member_id, 'broker'::public.app_role)
      OR public.has_role(_member_id, 'broker_staff'::public.app_role)
      OR public.has_role(_member_id, 'super_admin'::public.app_role)
      OR public.has_role(_member_id, 'platform_owner'::public.app_role)
      OR public.has_role(_member_id, 'tenant_owner'::public.app_role)
    ) THEN
      RAISE EXCEPTION 'A selected person is not an internal team member in your brokerage';
    END IF;
  END LOOP;

  IF _type = 'direct'::public.conversation_type
     AND cardinality(ARRAY(SELECT DISTINCT x FROM unnest(COALESCE(_member_ids, ARRAY[]::uuid[])) x WHERE x <> _user_id)) <> 1 THEN
    RAISE EXCEPTION 'A direct conversation requires one other person';
  END IF;

  INSERT INTO public.conversations (
    organisation_id, type, name, description, is_private, deal_id, created_by
  ) VALUES (
    _tenant_id, _type, NULLIF(btrim(_name), ''), NULLIF(btrim(_description), ''),
    CASE WHEN _type = 'direct'::public.conversation_type THEN true ELSE _is_private END,
    _deal_id, _user_id
  )
  RETURNING id INTO _conversation_id;

  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  VALUES (_conversation_id, _user_id, 'owner'::public.conversation_member_role);

  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  SELECT _conversation_id, x, 'member'::public.conversation_member_role
  FROM (
    SELECT DISTINCT unnest(COALESCE(_member_ids, ARRAY[]::uuid[])) AS x
  ) members
  WHERE x <> _user_id;

  RETURN _conversation_id;
END;
$function$;