
CREATE TYPE public.conversation_type AS ENUM ('direct','group','channel','deal');
CREATE TYPE public.conversation_member_role AS ENUM ('owner','admin','member');
CREATE TYPE public.chat_message_type AS ENUM ('text','file','image','system','meeting');
CREATE TYPE public.meeting_status AS ENUM ('scheduled','live','ended','cancelled');

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type public.conversation_type NOT NULL DEFAULT 'group',
  name text,
  description text,
  is_private boolean NOT NULL DEFAULT true,
  deal_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  avatar_url text,
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.conversation_member_role NOT NULL DEFAULT 'member',
  is_external boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  notifications_enabled boolean NOT NULL DEFAULT true,
  is_muted boolean NOT NULL DEFAULT false,
  is_favourite boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  UNIQUE (conversation_id, user_id)
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text,
  message_type public.chat_message_type NOT NULL DEFAULT 'text',
  parent_message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE public.message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pinned_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  pinned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, message_id)
);

CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider text,
  provider_room_id text,
  title text,
  status public.meeting_status NOT NULL DEFAULT 'scheduled',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_parent ON public.messages(parent_message_id);
CREATE INDEX idx_conv_members_user ON public.conversation_members(user_id);
CREATE INDEX idx_conv_members_conv ON public.conversation_members(conversation_id);
CREATE INDEX idx_conversations_org ON public.conversations(organisation_id);
CREATE INDEX idx_conversations_deal ON public.conversations(deal_id);
CREATE INDEX idx_reactions_message ON public.message_reactions(message_id);
CREATE INDEX idx_attachments_message ON public.message_attachments(message_id);

CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.is_conversation_admin(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conversation_id AND user_id = _user_id
      AND role IN ('owner','admin')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_conversation_admin(uuid, uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.can_view_conversation(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation_id
      AND (
        public.is_conversation_member(_conversation_id, _user_id)
        OR (c.type = 'channel' AND c.is_private = false
            AND c.organisation_id = public.get_my_tenant_id(_user_id))
      )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_conversation(uuid, uuid) FROM PUBLIC, anon;

CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_messages_updated BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_touch_conversation AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_on_message();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pinned_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.conversations, public.conversation_members, public.messages,
  public.message_reactions, public.message_attachments, public.pinned_messages,
  public.meetings TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY conv_select ON public.conversations FOR SELECT TO authenticated
USING (public.can_view_conversation(id, auth.uid()));
CREATE POLICY conv_insert ON public.conversations FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND organisation_id = public.get_my_tenant_id(auth.uid()));
CREATE POLICY conv_update ON public.conversations FOR UPDATE TO authenticated
USING (public.is_conversation_admin(id, auth.uid()))
WITH CHECK (organisation_id = public.get_my_tenant_id(auth.uid()));
CREATE POLICY conv_delete ON public.conversations FOR DELETE TO authenticated
USING (public.is_conversation_admin(id, auth.uid()));

CREATE POLICY cm_select ON public.conversation_members FOR SELECT TO authenticated
USING (public.can_view_conversation(conversation_id, auth.uid()));
CREATE POLICY cm_insert ON public.conversation_members FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.is_conversation_admin(conversation_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.conversations c
             WHERE c.id = conversation_id AND c.created_by = auth.uid())
);
CREATE POLICY cm_update ON public.conversation_members FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_conversation_admin(conversation_id, auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_conversation_admin(conversation_id, auth.uid()));
CREATE POLICY cm_delete ON public.conversation_members FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_conversation_admin(conversation_id, auth.uid()));

CREATE POLICY msg_select ON public.messages FOR SELECT TO authenticated
USING (public.can_view_conversation(conversation_id, auth.uid()));
CREATE POLICY msg_insert ON public.messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY msg_update ON public.messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid() OR public.is_conversation_admin(conversation_id, auth.uid()))
WITH CHECK (sender_id = auth.uid() OR public.is_conversation_admin(conversation_id, auth.uid()));

CREATE POLICY react_select ON public.message_reactions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.messages m
               WHERE m.id = message_id AND public.can_view_conversation(m.conversation_id, auth.uid())));
CREATE POLICY react_insert ON public.message_reactions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.messages m
  WHERE m.id = message_id AND public.is_conversation_member(m.conversation_id, auth.uid())));
CREATE POLICY react_delete ON public.message_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY att_select ON public.message_attachments FOR SELECT TO authenticated
USING (public.can_view_conversation(conversation_id, auth.uid()));
CREATE POLICY att_insert ON public.message_attachments FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY att_delete ON public.message_attachments FOR DELETE TO authenticated
USING (uploaded_by = auth.uid() OR public.is_conversation_admin(conversation_id, auth.uid()));

CREATE POLICY pin_select ON public.pinned_messages FOR SELECT TO authenticated
USING (public.can_view_conversation(conversation_id, auth.uid()));
CREATE POLICY pin_insert ON public.pinned_messages FOR INSERT TO authenticated
WITH CHECK (pinned_by = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY pin_delete ON public.pinned_messages FOR DELETE TO authenticated
USING (pinned_by = auth.uid() OR public.is_conversation_admin(conversation_id, auth.uid()));

CREATE POLICY meet_select ON public.meetings FOR SELECT TO authenticated
USING ((conversation_id IS NULL
        AND organisation_id = public.get_my_tenant_id(auth.uid()))
       OR public.can_view_conversation(conversation_id, auth.uid()));
CREATE POLICY meet_insert ON public.meetings FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND organisation_id = public.get_my_tenant_id(auth.uid()));
CREATE POLICY meet_update ON public.meetings FOR UPDATE TO authenticated
USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY chat_att_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments'
       AND public.can_view_conversation(((storage.foldername(name))[1])::uuid, auth.uid()));
CREATE POLICY chat_att_write ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments'
       AND public.is_conversation_member(((storage.foldername(name))[1])::uuid, auth.uid()));
CREATE POLICY chat_att_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-attachments' AND owner = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;
