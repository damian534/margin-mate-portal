import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ChatConversation, ChatMember } from '@/hooks/useChat';

/**
 * Opens the single conversation attached to a deal, creating it the first time
 * the Chat tab is opened (lazy creation — never more than one per deal).
 */
export function useDealConversation(leadId: string | null, enabled = true) {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!leadId || !enabled) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data: id, error: rpcErr } = await supabase.rpc('get_or_create_deal_conversation', {
      _lead_id: leadId,
    });
    if (rpcErr || !id) {
      setError(rpcErr?.message || 'Could not open the deal chat');
      setConversation(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('conversations')
      .select('id, type, name, description, is_private, deal_id, last_message_at, created_at, conversation_members(user_id, role, last_read_at)')
      .eq('id', id as string)
      .maybeSingle();

    const row = data as unknown as (Omit<ChatConversation, 'members' | 'unread' | 'myLastReadAt' | 'isMember'> & {
      conversation_members: ChatMember[];
    }) | null;

    if (!row) { setError('Could not open the deal chat'); setLoading(false); return; }

    const { data: auth } = await supabase.auth.getUser();
    const members = row.conversation_members || [];
    const mine = members.find(m => m.user_id === auth.user?.id);

    setConversation({
      id: row.id,
      type: row.type,
      name: row.name,
      description: row.description,
      is_private: row.is_private,
      deal_id: row.deal_id,
      last_message_at: row.last_message_at,
      created_at: row.created_at,
      members,
      unread: 0,
      myLastReadAt: mine?.last_read_at ?? null,
      isMember: !!mine,
    });
    setLoading(false);
  }, [leadId, enabled]);

  useEffect(() => { load(); }, [load]);

  return { conversation, loading, error, reload: load };
}
