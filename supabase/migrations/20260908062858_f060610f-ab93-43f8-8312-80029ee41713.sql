
REVOKE ALL ON FUNCTION public.get_or_create_deal_conversation(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.get_or_create_deal_conversation(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.post_deal_system_message(uuid, text, jsonb) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.deal_chat_lifecycle_events() FROM anon, authenticated, public;
