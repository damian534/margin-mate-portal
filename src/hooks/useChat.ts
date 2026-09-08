import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ConversationType = 'direct' | 'group' | 'channel' | 'deal';

export interface ChatPerson {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export interface ChatMember {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  last_read_at: string;
}

export interface ChatConversation {
  id: string;
  type: ConversationType;
  name: string | null;
  description: string | null;
  is_private: boolean;
  deal_id: string | null;
  last_message_at: string | null;
  created_at: string;
  members: ChatMember[];
  unread: number;
  myLastReadAt: string | null;
  isMember: boolean;
}

export interface ChatAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string | null;
  message_type: string;
  parent_message_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  attachments?: ChatAttachment[];
}

/** Roles allowed to use internal chat — clients/referral partners are excluded. */
const CHAT_ROLES = ['broker', 'broker_staff', 'super_admin', 'platform_owner'] as const;

/** Reads the signed-in user's brokerage id the same way the database security rules do. */
export async function resolveMyTenantId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles').select('tenant_id').eq('user_id', user.id).limit(1).maybeSingle();
  return (data as { tenant_id: string | null } | null)?.tenant_id ?? null;
}

/** Brokers, support staff and admins in the signed-in user's brokerage. */
export function useOrgPeople() {
  const { user } = useAuth();
  const [people, setPeople] = useState<ChatPerson[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) { setLoading(false); return; }
      const tid = await resolveMyTenantId();
      if (!active) return;
      setTenantId(tid);
      if (!tid) { setPeople([]); setLoading(false); return; }
      const [{ data: profs }, { data: roleRows }] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .eq('tenant_id', tid)
          .not('user_id', 'is', null)
          .order('full_name'),
        supabase
          .from('user_roles')
          .select('user_id, role')
          .in('role', CHAT_ROLES as unknown as string[]),
      ]);
      if (!active) return;
      const allowed = new Set(((roleRows as { user_id: string }[]) || []).map(r => r.user_id));
      setPeople(((profs as ChatPerson[]) || []).filter(p => !!p.user_id && allowed.has(p.user_id)));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  return { people, tenantId, loading };
}


export function personLabel(people: ChatPerson[], userId: string | null | undefined) {
  if (!userId) return 'Unknown';
  const p = people.find(x => x.user_id === userId);
  return p?.full_name || p?.email || 'Team member';
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
}

/** Conversations the user can see, with unread counts. */
export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setConversations([]); setLoading(false); return; }
    const { data } = await supabase
      .from('conversations')
      .select('id, type, name, description, is_private, deal_id, last_message_at, created_at, is_archived, conversation_members(user_id, role, last_read_at)')
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    const rows = (data || []) as unknown as (Omit<ChatConversation, 'members' | 'unread' | 'myLastReadAt' | 'isMember'> & {
      conversation_members: ChatMember[];
    })[];

    const base: ChatConversation[] = rows.map(r => {
      const members = r.conversation_members || [];
      const mine = members.find(m => m.user_id === user.id);
      return {
        id: r.id,
        type: r.type,
        name: r.name,
        description: r.description,
        is_private: r.is_private,
        deal_id: r.deal_id,
        last_message_at: r.last_message_at,
        created_at: r.created_at,
        members,
        unread: 0,
        myLastReadAt: mine?.last_read_at ?? null,
        isMember: !!mine,
      };
    });

    // Unread = messages after my last_read_at that I did not send.
    const joined = base.filter(c => c.isMember && c.myLastReadAt);
    if (joined.length) {
      const earliest = joined.reduce((min, c) => (c.myLastReadAt! < min ? c.myLastReadAt! : min), joined[0].myLastReadAt!);
      const { data: recent } = await supabase
        .from('messages')
        .select('conversation_id, created_at, sender_id')
        .in('conversation_id', joined.map(c => c.id))
        .gt('created_at', earliest)
        .is('deleted_at', null)
        .limit(1000);
      for (const m of (recent || []) as { conversation_id: string; created_at: string; sender_id: string | null }[]) {
        if (m.sender_id === user.id) continue;
        const conv = base.find(c => c.id === m.conversation_id);
        if (conv?.myLastReadAt && m.created_at > conv.myLastReadAt) conv.unread += 1;
      }
    }

    setConversations(base);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Any new message anywhere refreshes the list (ordering + unread badges).
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('chat-conversation-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const totalUnread = useMemo(
    () => conversations.reduce((n, c) => n + c.unread, 0),
    [conversations],
  );

  return { conversations, loading, reload: load, totalUnread };
}

/** Badge count for the side navigation. */
export function useUnreadChatCount() {
  const { user, isPreviewMode } = useAuth();
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!user || isPreviewMode) { setCount(0); return; }
    const { data: mem } = await supabase
      .from('conversation_members')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id);
    const rows = (mem || []) as { conversation_id: string; last_read_at: string }[];
    if (!rows.length) { setCount(0); return; }
    const earliest = rows.reduce((min, r) => (r.last_read_at < min ? r.last_read_at : min), rows[0].last_read_at);
    const { data: msgs } = await supabase
      .from('messages')
      .select('conversation_id, created_at, sender_id')
      .in('conversation_id', rows.map(r => r.conversation_id))
      .gt('created_at', earliest)
      .is('deleted_at', null)
      .limit(1000);
    let n = 0;
    for (const m of (msgs || []) as { conversation_id: string; created_at: string; sender_id: string | null }[]) {
      if (m.sender_id === user.id) continue;
      const r = rows.find(x => x.conversation_id === m.conversation_id);
      if (r && m.created_at > r.last_read_at) n += 1;
    }
    setCount(n);
  }, [user, isPreviewMode]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user || isPreviewMode) return;
    const channel = supabase
      .channel('chat-unread-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_members' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isPreviewMode, load]);

  return count;
}

/** Finds an existing direct conversation with exactly these two people, or creates one. */
export async function getOrCreateDirect(
  myId: string, otherId: string, tenantId: string,
): Promise<string> {
  const { data: mine } = await supabase
    .from('conversation_members')
    .select('conversation_id, conversations!inner(type)')
    .eq('user_id', myId);
  const directIds = ((mine || []) as unknown as { conversation_id: string; conversations: { type: string } }[])
    .filter(r => r.conversations?.type === 'direct')
    .map(r => r.conversation_id);
  if (directIds.length) {
    const { data: theirs } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', otherId)
      .in('conversation_id', directIds);
    const match = (theirs || [])[0] as { conversation_id: string } | undefined;
    if (match) return match.conversation_id;
  }

  const { data: conv, error } = await supabase
    .from('conversations')
    .insert({ organisation_id: tenantId, type: 'direct', is_private: true, created_by: myId })
    .select('id')
    .single();
  if (error) throw error;
  const id = (conv as { id: string }).id;
  const { error: memErr } = await supabase.from('conversation_members').insert([
    { conversation_id: id, user_id: myId, role: 'owner' as const },
    { conversation_id: id, user_id: otherId, role: 'member' as const },
  ]);
  if (memErr) throw memErr;
  return id;
}

export async function createGroupOrChannel(opts: {
  myId: string;
  tenantId: string;
  type: 'group' | 'channel';
  name: string;
  description?: string;
  isPrivate: boolean;
  memberIds: string[];
}): Promise<string> {
  const { data: conv, error } = await supabase
    .from('conversations')
    .insert({
      organisation_id: opts.tenantId,
      type: opts.type,
      name: opts.name,
      description: opts.description || null,
      is_private: opts.isPrivate,
      created_by: opts.myId,
    })
    .select('id')
    .single();
  if (error) throw error;
  const id = (conv as { id: string }).id;
  const others = opts.memberIds.filter(u => u !== opts.myId);
  const { error: memErr } = await supabase.from('conversation_members').insert([
    { conversation_id: id, user_id: opts.myId, role: 'owner' as const },
    ...others.map(u => ({ conversation_id: id, user_id: u, role: 'member' as const })),
  ]);
  if (memErr) throw memErr;
  return id;
}

export function conversationTitle(c: ChatConversation, people: ChatPerson[], myId: string | null) {
  if (c.type === 'direct') {
    const other = c.members.find(m => m.user_id !== myId) || c.members[0];
    return personLabel(people, other?.user_id);
  }
  return c.name || 'Untitled';
}
