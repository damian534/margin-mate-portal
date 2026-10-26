import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppHeader } from '@/components/AppHeader';
import { AppSideNav } from '@/components/AppSideNav';
import {
  Mail, Phone, ListTodo, FileText, Send, DollarSign, UserPlus, RefreshCw,
  Settings2, Sparkles, Landmark, CheckCircle2, Loader2, Newspaper,
  type LucideIcon,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

type FeedKind = 'email' | 'call' | 'task' | 'document' | 'mir' | 'finance' | 'contact' | 'status' | 'system' | 'new_lead' | 'settlement';

interface FeedItem {
  id: string;
  kind: FeedKind;
  text: string;
  leadId: string | null;
  leadName: string | null;
  author: string | null;
  time: Date;
}

const KIND_META: Record<FeedKind, { label: string; Icon: LucideIcon; iconClass: string }> = {
  email: { label: 'Emails', Icon: Mail, iconClass: 'bg-info/10 text-info' },
  call: { label: 'Calls', Icon: Phone, iconClass: 'bg-success/10 text-success' },
  task: { label: 'Tasks', Icon: ListTodo, iconClass: 'bg-warning/10 text-warning' },
  document: { label: 'Documents', Icon: FileText, iconClass: 'bg-muted text-muted-foreground' },
  mir: { label: 'MIR', Icon: Send, iconClass: 'bg-info/10 text-info' },
  finance: { label: 'Finance', Icon: DollarSign, iconClass: 'bg-success/10 text-success' },
  contact: { label: 'Contacts', Icon: UserPlus, iconClass: 'bg-muted text-muted-foreground' },
  status: { label: 'Stage changes', Icon: RefreshCw, iconClass: 'bg-primary/10 text-primary' },
  system: { label: 'System', Icon: Settings2, iconClass: 'bg-muted text-muted-foreground' },
  new_lead: { label: 'New leads', Icon: Sparkles, iconClass: 'bg-primary/10 text-primary' },
  settlement: { label: 'Settlements', Icon: Landmark, iconClass: 'bg-success/10 text-success' },
};

const EMOJI_KIND: [string, FeedKind][] = [
  ['📧', 'email'], ['📞', 'call'], ['📋', 'task'], ['📄', 'document'], ['📨', 'mir'],
  ['💰', 'finance'], ['👤', 'contact'], ['🔄', 'status'], ['⚙️', 'system'],
];

function kindFromContent(content: string): { kind: FeedKind; text: string } {
  for (const [emoji, kind] of EMOJI_KIND) {
    if (content.startsWith(emoji)) return { kind, text: content.slice(emoji.length).trim() };
  }
  return { kind: 'system', text: content };
}

const FILTERS: { key: FeedKind | 'all'; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'new_lead', label: 'New leads' },
  { key: 'status', label: 'Stage changes' },
  { key: 'settlement', label: 'Settlements' },
  { key: 'email', label: 'Emails' },
  { key: 'task', label: 'Tasks' },
  { key: 'document', label: 'Documents' },
];

function dayLabel(d: Date): string {
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE, d MMMM');
}

const SAMPLE_FEED: FeedItem[] = [
  { id: 's1', kind: 'new_lead', text: 'New lead: Sarah Thompson — $650,000 refinance', leadId: null, leadName: 'Sarah Thompson', author: null, time: new Date() },
  { id: 's2', kind: 'status', text: 'Stage changed to Proposal Sent', leadId: null, leadName: 'James Carter', author: 'You', time: new Date(Date.now() - 3600e3) },
  { id: 's3', kind: 'email', text: 'Post-meeting summary emailed to client', leadId: null, leadName: 'Priya Nair', author: 'You', time: new Date(Date.now() - 7200e3) },
  { id: 's4', kind: 'settlement', text: 'Settlement recorded — $820,000', leadId: null, leadName: 'Mark Nguyen', author: null, time: new Date(Date.now() - 86400e3) },
  { id: 's5', kind: 'document', text: 'Client uploaded 2 documents', leadId: null, leadName: 'Olivia Bennett', author: null, time: new Date(Date.now() - 90000e3) },
];

export default function Newsfeed() {
  const { isPreviewMode, effectiveBrokerId, user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FeedKind | 'all'>('all');

  const load = useCallback(async () => {
    if (isPreviewMode) {
      setItems(SAMPLE_FEED);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [notesRes, leadsRes, settlementsRes] = await Promise.all([
      supabase.from('notes').select('id, lead_id, content, author_id, created_at').order('created_at', { ascending: false }).limit(150),
      supabase.from('leads').select('id, first_name, last_name, opportunity_name, loan_amount, created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('settlements').select('*').order('created_at', { ascending: false }).limit(50),
    ]);

    const leads = (leadsRes.data as any[]) || [];
    const leadName = new Map<string, string>();
    leads.forEach(l => {
      leadName.set(l.id, [l.first_name, l.last_name].filter(Boolean).join(' ') || l.opportunity_name || 'Unnamed deal');
    });

    // Author names for note entries
    const authorIds = Array.from(new Set(((notesRes.data as any[]) || []).map(n => n.author_id).filter(Boolean)));
    const authorName = new Map<string, string>();
    if (authorIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email').in('user_id', authorIds);
      ((profiles as any[]) || []).forEach(p => authorName.set(p.user_id, p.full_name || p.email || 'Team member'));
    }

    const feed: FeedItem[] = [];

    ((notesRes.data as any[]) || []).forEach(n => {
      if (!n.content) return;
      const { kind, text } = kindFromContent(n.content);
      feed.push({
        id: `note-${n.id}`,
        kind,
        text,
        leadId: n.lead_id,
        leadName: n.lead_id ? leadName.get(n.lead_id) ?? null : null,
        author: n.author_id ? authorName.get(n.author_id) ?? null : null,
        time: new Date(n.created_at),
      });
    });

    leads.forEach(l => {
      const name = leadName.get(l.id)!;
      feed.push({
        id: `lead-${l.id}`,
        kind: 'new_lead',
        text: `New lead: ${name}${l.loan_amount ? ` — $${Number(l.loan_amount).toLocaleString()}` : ''}`,
        leadId: l.id,
        leadName: name,
        author: null,
        time: new Date(l.created_at),
      });
    });

    ((settlementsRes.data as any[]) || []).forEach(s => {
      const amount = s.settlement_amount ?? s.loan_amount ?? s.amount;
      feed.push({
        id: `settlement-${s.id}`,
        kind: 'settlement',
        text: `Settlement recorded${amount ? ` — $${Number(amount).toLocaleString()}` : ''}`,
        leadId: s.lead_id ?? null,
        leadName: s.lead_id ? leadName.get(s.lead_id) ?? null : null,
        author: null,
        time: new Date(s.created_at),
      });
    });

    feed.sort((a, b) => b.time.getTime() - a.time.getTime());
    setItems(feed.slice(0, 200));
    setLoading(false);
  }, [isPreviewMode]);

  useEffect(() => { load(); }, [load, effectiveBrokerId]);

  // Live updates: prepend new timeline entries as they happen
  useEffect(() => {
    if (isPreviewMode || !user) return;
    const channel = supabase
      .channel('newsfeed-notes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notes' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isPreviewMode, user, load]);

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter(i => i.kind === filter)),
    [items, filter],
  );

  const groups = useMemo(() => {
    const map = new Map<string, FeedItem[]>();
    visible.forEach(item => {
      const key = dayLabel(item.time);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return Array.from(map.entries());
  }, [visible]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <div className="flex w-full flex-1 min-h-0 items-stretch">
        <AppSideNav />
        <main className="flex-1 min-w-0 overflow-y-auto border-l">
          <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-8 pb-16">
            {/* Header */}
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight leading-tight">Newsfeed</h1>
                <p className="text-[15px] text-muted-foreground mt-1.5">
                  Everything happening across your deals, as it happens.
                </p>
              </div>
              <button
                type="button"
                onClick={load}
                className="w-9 h-9 rounded-full bg-muted/70 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Filter pills */}
            <div className="mt-6 flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                    filter === f.key
                      ? 'bg-foreground text-background shadow-sm'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Feed */}
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : groups.length === 0 ? (
              <div className="mt-8 rounded-3xl border border-border/70 bg-card px-6 py-16 text-center">
                <span className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <Newspaper className="w-7 h-7 text-muted-foreground" strokeWidth={1.8} />
                </span>
                <p className="mt-4 text-lg font-semibold tracking-tight">Nothing here yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Activity on your deals — new leads, stage changes, emails, documents — will show up here.
                </p>
              </div>
            ) : (
              groups.map(([day, dayItems]) => (
                <section key={day} className="mt-8">
                  <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-1 mb-3">
                    {day}
                  </h2>
                  <div className="rounded-3xl border border-border/70 bg-card shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_8px_24px_-12px_hsl(var(--foreground)/0.08)] overflow-hidden divide-y divide-border/50">
                    {dayItems.map(item => {
                      const meta = KIND_META[item.kind];
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => item.leadId && navigate(`/admin?lead=${item.leadId}`)}
                          className={`w-full text-left flex items-start gap-4 px-5 sm:px-6 py-4 transition-colors group ${item.leadId ? 'hover:bg-muted/40 cursor-pointer' : 'cursor-default'}`}
                        >
                          <span className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${meta.iconClass}`}>
                            <meta.Icon className="w-4.5 h-4.5" strokeWidth={2.2} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-medium tracking-tight leading-snug">{item.text}</p>
                            <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                              {[item.leadName, item.author ? `by ${item.author}` : null, format(item.time, 'h:mm a')]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>
                          {item.kind === 'settlement' && (
                            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
