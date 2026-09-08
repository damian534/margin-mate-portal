import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, Hash, Loader2, Paperclip, Send, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  conversationTitle, initials, personLabel,
  type ChatAttachment, type ChatConversation, type ChatMessage, type ChatPerson,
} from '@/hooks/useChat';

const PAGE = 40;

interface Props {
  conversation: ChatConversation;
  people: ChatPerson[];
  myId: string;
  onChanged: () => void;
  /** Optional secondary line under the title. */
  subtitle?: string;
  /** Optional control on the right of the header (e.g. Open deal). */
  headerAction?: React.ReactNode;
}

function dayLabel(d: Date) {
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE d MMMM');
}

export function ChatConversationView({ conversation, people, myId, onChanged, subtitle, headerAction }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [joining, setJoining] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const title = conversationTitle(conversation, people, myId);

  const fetchPage = useCallback(async (before?: string) => {
    let q = supabase
      .from('messages')
      .select('id, conversation_id, sender_id, body, message_type, parent_message_id, edited_at, deleted_at, created_at, message_attachments(id, file_name, file_path, file_type, file_size)')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(PAGE);
    if (before) q = q.lt('created_at', before);
    const { data, error } = await q;
    if (error) { toast.error('Could not load messages'); return []; }
    const rows = ((data || []) as unknown as (ChatMessage & { message_attachments: ChatAttachment[] })[])
      .map(m => ({ ...m, attachments: m.message_attachments || [] }))
      .reverse();
    setHasMore(rows.length === PAGE);
    return rows;
  }, [conversation.id]);

  const markRead = useCallback(async () => {
    if (!conversation.isMember) return;
    await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversation.id)
      .eq('user_id', myId);
    onChanged();
  }, [conversation.id, conversation.isMember, myId, onChanged]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const rows = await fetchPage();
      if (!active) return;
      setMessages(rows);
      setLoading(false);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView());
      markRead();
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  // Live updates for this conversation.
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
        async payload => {
          const row = (payload.new || payload.old) as ChatMessage;
          if (payload.eventType === 'INSERT') {
            const { data } = await supabase
              .from('messages')
              .select('id, conversation_id, sender_id, body, message_type, parent_message_id, edited_at, deleted_at, created_at, message_attachments(id, file_name, file_path, file_type, file_size)')
              .eq('id', row.id)
              .maybeSingle();
            const full = data as unknown as (ChatMessage & { message_attachments: ChatAttachment[] }) | null;
            if (!full) return;
            setMessages(p => (p.some(m => m.id === full.id) ? p : [...p, { ...full, attachments: full.message_attachments || [] }]));
            requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
            if (full.sender_id !== myId) markRead();
          } else {
            setMessages(p => p.map(m => (m.id === row.id ? { ...m, ...(payload.new as ChatMessage) } : m)));
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversation.id, myId, markRead]);

  const loadOlder = async () => {
    if (!messages.length) return;
    setLoadingMore(true);
    const older = await fetchPage(messages[0].created_at);
    setMessages(p => [...older, ...p]);
    setLoadingMore(false);
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft('');
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversation.id, sender_id: myId, body, message_type: 'text',
    });
    setSending(false);
    if (error) { toast.error('Message could not be sent'); setDraft(body); return; }
    onChanged();
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${conversation.id}/${crypto.randomUUID()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from('chat-attachments')
        .upload(path, file, { contentType: file.type || 'application/octet-stream' });
      if (upErr) throw upErr;
      const { data: msg, error: msgErr } = await supabase.from('messages')
        .insert({ conversation_id: conversation.id, sender_id: myId, body: draft.trim() || null, message_type: 'file' })
        .select('id').single();
      if (msgErr) throw msgErr;
      const { error: attErr } = await supabase.from('message_attachments').insert({
        message_id: (msg as { id: string }).id,
        conversation_id: conversation.id,
        uploaded_by: myId,
        file_name: file.name,
        file_path: path,
        file_type: file.type || null,
        file_size: file.size,
      });
      if (attErr) throw attErr;
      setDraft('');
      onChanged();
    } catch (e) {
      toast.error((e as Error).message || 'Could not upload that file');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const openAttachment = async (a: ChatAttachment) => {
    const { data, error } = await supabase.storage.from('chat-attachments').createSignedUrl(a.file_path, 60);
    if (error || !data?.signedUrl) { toast.error('Could not open that file'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const remove = async (m: ChatMessage) => {
    const { error } = await supabase.from('messages')
      .update({ deleted_at: new Date().toISOString() }).eq('id', m.id);
    if (error) toast.error('Could not delete that message');
  };

  const join = async () => {
    setJoining(true);
    const { error } = await supabase.from('conversation_members')
      .insert({ conversation_id: conversation.id, user_id: myId, role: 'member' });
    setJoining(false);
    if (error) { toast.error('Could not join this channel'); return; }
    onChanged();
  };

  const grouped = useMemo(() => {
    const out: { day: string; items: ChatMessage[] }[] = [];
    for (const m of messages) {
      const day = dayLabel(new Date(m.created_at));
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [messages]);

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full">
      <div className="border-b px-4 py-2.5 flex items-center gap-2 bg-card">
        {conversation.type === 'channel' ? <Hash className="w-4 h-4 text-muted-foreground" />
          : conversation.type === 'deal' ? <Briefcase className="w-4 h-4 text-muted-foreground" />
          : conversation.type === 'direct'
            ? <span className="w-6 h-6 rounded-full bg-muted text-[10px] font-semibold flex items-center justify-center">{initials(title)}</span>
            : <Users className="w-4 h-4 text-muted-foreground" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{title}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {subtitle || (
              <>
                {conversation.members.length} {conversation.members.length === 1 ? 'member' : 'members'}
                {conversation.description ? ` · ${conversation.description}` : ''}
              </>
            )}
          </p>
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={loadOlder} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Load earlier messages'}
                </Button>
              </div>
            )}
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">
                No messages yet. Say hello.
              </p>
            )}
            {grouped.map(g => (
              <div key={g.day} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-[11px] text-muted-foreground">{g.day}</span>
                  <div className="h-px bg-border flex-1" />
                </div>
                {g.items.map(m => {
                  const mine = m.sender_id === myId;
                  const who = personLabel(people, m.sender_id);
                  if (m.message_type === 'system') {
                    return (
                      <div key={m.id} className="flex items-center gap-3 py-1">
                        <div className="h-px bg-border flex-1" />
                        <span className="text-[11px] text-muted-foreground text-center px-2">
                          {m.body} · {format(new Date(m.created_at), 'h:mma')}
                        </span>
                        <div className="h-px bg-border flex-1" />
                      </div>
                    );
                  }
                  return (
                    <div key={m.id} className={cn('flex gap-2.5 group', mine && 'flex-row-reverse')}>
                      <span className="w-7 h-7 rounded-full bg-muted text-[10px] font-semibold flex items-center justify-center shrink-0">
                        {initials(who)}
                      </span>
                      <div className={cn('max-w-[75%] min-w-0', mine && 'text-right')}>
                        <p className="text-[11px] text-muted-foreground">
                          {mine ? 'You' : who} · {format(new Date(m.created_at), 'h:mma')}
                        </p>
                        {m.deleted_at ? (
                          <p className="text-sm italic text-muted-foreground">Message deleted</p>
                        ) : (
                          <div className={cn('inline-block rounded-2xl px-3 py-2 text-sm text-left whitespace-pre-wrap break-words',
                            mine ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                            {m.body}
                            {(m.attachments || []).map(a => (
                              <button key={a.id} onClick={() => openAttachment(a)}
                                className={cn('mt-1 flex items-center gap-1.5 text-xs underline underline-offset-2',
                                  m.body ? 'pt-1' : '')}>
                                <Paperclip className="w-3 h-3" /> {a.file_name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {mine && !m.deleted_at && (
                        <button onClick={() => remove(m)} title="Delete message"
                          className="self-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {conversation.isMember ? (
        <div className="border-t p-3 bg-card">
          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
            <Button variant="ghost" size="icon" className="shrink-0" disabled={uploading}
              onClick={() => fileRef.current?.click()} aria-label="Attach a file">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </Button>
            <Textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={`Message ${title}`}
              rows={1}
              className="min-h-[40px] max-h-40 resize-y"
            />
            <Button onClick={send} disabled={sending || !draft.trim()} className="shrink-0 gap-1.5">
              <Send className="w-4 h-4" /> Send
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t p-3 bg-card flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">You are viewing this channel. Join to post.</p>
          <Button size="sm" onClick={join} disabled={joining}>Join channel</Button>
        </div>
      )}
    </div>
  );
}
