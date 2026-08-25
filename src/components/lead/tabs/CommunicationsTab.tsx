import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SectionCard } from '@/components/lead/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Mail, Phone, Users, Send, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Channel = 'email' | 'call' | 'sms' | 'meeting';

interface Entry {
  id: string;
  channel: Channel | string;
  direction: string;
  subject: string | null;
  body: string | null;
  participant: string | null;
  occurred_at: string;
  system: boolean;
}

const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'call', label: 'Phone call' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'meeting', label: 'Meeting' },
];

const channelIcon = (c: string) =>
  c === 'email' ? Mail : c === 'call' ? Phone : c === 'meeting' ? Users : MessageSquare;

const channelColor = (c: string) =>
  c === 'email' ? 'bg-blue-500' : c === 'call' ? 'bg-green-500' : c === 'meeting' ? 'bg-indigo-500' : 'bg-teal-500';

interface Props {
  leadId: string;
  isPreviewMode: boolean;
  clientEmail?: string | null;
  clientPhone?: string | null;
}

export function CommunicationsTab({ leadId, isPreviewMode, clientEmail, clientPhone }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [channel, setChannel] = useState<Channel>('call');
  const [direction, setDirection] = useState('outbound');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [participant, setParticipant] = useState('');
  const [occurredAt, setOccurredAt] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (isPreviewMode) { setEntries([]); setLoading(false); return; }
    setLoading(true);
    const [manual, mirs, extensions, reminders] = await Promise.all([
      supabase.from('lead_communications' as any)
        .select('id, channel, direction, subject, body, participant_name, participant_contact, occurred_at')
        .eq('lead_id', leadId),
      supabase.from('mir_requests')
        .select('id, recipient_emails, lender, message, requested_at, document_count')
        .eq('lead_id', leadId),
      supabase.from('lead_finance_extensions')
        .select('id, recipient_email, recipient_name, requested_days, proposed_new_date, message, sent_at')
        .eq('lead_id', leadId),
      supabase.from('document_reminder_sends')
        .select('id, recipient_email, recipient_name, day_offset, sent_at')
        .eq('lead_id', leadId),
    ]);

    const list: Entry[] = [];

    for (const m of ((manual.data as any[]) || [])) {
      list.push({
        id: `m-${m.id}`,
        channel: m.channel,
        direction: m.direction,
        subject: m.subject,
        body: m.body,
        participant: m.participant_name || m.participant_contact || null,
        occurred_at: m.occurred_at,
        system: false,
      });
    }
    for (const r of ((mirs.data as any[]) || [])) {
      list.push({
        id: `mir-${r.id}`,
        channel: 'email',
        direction: 'outbound',
        subject: `MIR sent${r.lender ? ` · ${r.lender}` : ''} · ${r.document_count} document(s)`,
        body: r.message,
        participant: (r.recipient_emails || []).join(', '),
        occurred_at: r.requested_at,
        system: true,
      });
    }
    for (const e of ((extensions.data as any[]) || [])) {
      list.push({
        id: `fx-${e.id}`,
        channel: 'email',
        direction: 'outbound',
        subject: `Finance extension requested · ${e.requested_days} days${e.proposed_new_date ? ` → ${e.proposed_new_date}` : ''}`,
        body: e.message,
        participant: e.recipient_name || e.recipient_email,
        occurred_at: e.sent_at,
        system: true,
      });
    }
    for (const d of ((reminders.data as any[]) || [])) {
      list.push({
        id: `dr-${d.id}`,
        channel: 'email',
        direction: 'outbound',
        subject: `Document reminder (day ${d.day_offset})`,
        body: null,
        participant: d.recipient_name || d.recipient_email,
        occurred_at: d.sent_at,
        system: true,
      });
    }

    list.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    setEntries(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [leadId, isPreviewMode]);

  const resetForm = () => {
    setShowForm(false); setSubject(''); setBody(''); setParticipant('');
    setChannel('call'); setDirection('outbound'); setOccurredAt(format(new Date(), 'yyyy-MM-dd'));
  };

  const log = async () => {
    if (!subject.trim() && !body.trim()) { toast.error('Add a subject or summary'); return; }
    if (isPreviewMode) { toast.info('Preview mode — not saved'); resetForm(); return; }
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from('lead_communications' as any).insert({
      lead_id: leadId,
      channel,
      direction,
      subject: subject.trim() || null,
      body: body.trim() || null,
      participant_name: participant.trim() || null,
      participant_contact: channel === 'email' ? (clientEmail ?? null) : (clientPhone ?? null),
      occurred_at: new Date(`${occurredAt}T09:00`).toISOString(),
      created_by: userRes?.user?.id ?? null,
    } as any);
    if (error) { toast.error('Failed to log communication'); return; }
    toast.success('Communication logged');
    resetForm();
    load();
  };

  return (
    <SectionCard
      icon={MessageSquare}
      title="Communications"
      tone="neutral"
      subtitle={loading ? 'Loading…' : entries.length ? `${entries.length} recorded` : 'Nothing logged yet'}
      rightSlot={
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowForm(s => !s)}>
          <Plus className="w-3 h-3" /> Log
        </Button>
      }
    >
      {showForm && (
        <div className="rounded-lg border bg-background p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Channel</Label>
              <Select value={channel} onValueChange={v => setChannel(v as Channel)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Direction</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Date</Label>
              <Input type="date" className="h-9" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Subject</Label>
              <Input className="h-9" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Discussed pricing options" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Who with</Label>
              <Input className="h-9" value={participant} onChange={e => setParticipant(e.target.value)} placeholder="Client, lender, solicitor…" />
            </div>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Summary</Label>
            <Textarea rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="What was discussed and agreed…" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
            <Button size="sm" className="gap-1.5" onClick={log}><Send className="w-3.5 h-3.5" /> Log</Button>
          </div>
        </div>
      )}

      {entries.length === 0 && !loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Emails sent from Connect appear here automatically. Log calls, SMS and meetings to keep a complete record.
        </p>
      ) : (
        <div className="relative pl-6 space-y-0">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
          {entries.map(e => {
            const Icon = channelIcon(e.channel);
            return (
              <div key={e.id} className="relative pb-3">
                <div className={`absolute -left-[14px] top-1.5 w-3 h-3 rounded-full border-2 border-background ${channelColor(e.channel)}`} />
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{e.subject || e.channel}</span>
                      </p>
                      {e.participant && <p className="text-[11px] text-muted-foreground truncate">{e.participant}</p>}
                      {e.body && <p className="text-xs mt-1 whitespace-pre-wrap">{e.body}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-muted-foreground">{format(new Date(e.occurred_at), 'dd MMM yyyy')}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {e.system ? 'Auto' : e.direction}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
