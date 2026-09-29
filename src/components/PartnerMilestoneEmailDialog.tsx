import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/leadAudit';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Handshake, Clock, PartyPopper, BadgeCheck, Home } from 'lucide-react';

export type PartnerMilestoneKey = 'introduction' | 'extension' | 'formal_approval' | 'unconditional' | 'settled';

export interface PartnerRecipient {
  linkId: string;
  name: string;
  firstName: string;
  email: string;
  role: string;
  roleLabel: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  leadId: string;
  brokerId: string | null;
  clientName: string;
  clientEmail: string | null;
  dealName: string | null;
  financeDueDate: string | null;
  recipients: PartnerRecipient[];
  initialMilestone?: PartnerMilestoneKey;
  isPreview?: boolean;
}

const isLegal = (r: string) => r === 'conveyancer' || r === 'solicitor';
const isAgent = (r: string) => r === 'real_estate_agent' || r === 'buyers_agent';

const MILESTONES: {
  key: PartnerMilestoneKey;
  label: string;
  icon: any;
  defaultTo: (role: string) => boolean;
  subject: string;
  body: string;
}[] = [
  {
    key: 'introduction',
    label: 'Introduction',
    icon: Handshake,
    defaultTo: (r) => isLegal(r) || isAgent(r),
    subject: 'Introduction — {client_name} finance',
    body:
      `Hi {recipient_names},\n\nI'm {broker_name}, the mortgage broker looking after finance for {client_name}{deal_suffix}.\n\n` +
      `I wanted to introduce myself so we can all keep in touch as the purchase progresses. The current finance due date is {finance_due_date}.\n\n` +
      `I'll keep you updated at each key stage — please don't hesitate to reach out if you need anything from me.\n\nKind regards,\n{sender_name}`,
  },
  {
    key: 'extension',
    label: 'Extension requested',
    icon: Clock,
    defaultTo: (r) => isLegal(r),
    subject: 'Finance update — extension requested for {client_name}',
    body:
      `Hi {recipient_names},\n\nJust a quick update on {client_name}'s finance{deal_suffix}. We are still working through the lender's assessment and have requested an extension to the finance clause (currently due {finance_due_date}).\n\n` +
      `I'll let you know as soon as we have a further update.\n\nKind regards,\n{sender_name}`,
  },
  {
    key: 'formal_approval',
    label: 'Formal approval',
    icon: PartyPopper,
    defaultTo: (r) => isLegal(r) || isAgent(r),
    subject: 'Great news — formal approval for {client_name}',
    body:
      `Hi {recipient_names},\n\nGreat news — {client_name}'s loan{deal_suffix} has been formally approved by the lender.\n\n` +
      `We'll now move through loan documents and settlement preparation. Please let me know if you need anything further from our side.\n\nKind regards,\n{sender_name}`,
  },
  {
    key: 'unconditional',
    label: 'Unconditional',
    icon: BadgeCheck,
    defaultTo: (r) => isLegal(r) || isAgent(r),
    subject: 'Finance unconditional — {client_name}',
    body:
      `Hi {recipient_names},\n\nI'm pleased to confirm that finance for {client_name}{deal_suffix} is now unconditional.\n\n` +
      `We'll continue working towards settlement and will be in touch with the bank's settlement details.\n\nKind regards,\n{sender_name}`,
  },
  {
    key: 'settled',
    label: 'Settled',
    icon: Home,
    defaultTo: (r) => isLegal(r) || isAgent(r),
    subject: 'Settlement confirmed — {client_name}',
    body:
      `Hi {recipient_names},\n\nThank you for your help — I can confirm {client_name}'s purchase{deal_suffix} has now settled.\n\n` +
      `It was a pleasure working with you and I look forward to the next one.\n\nKind regards,\n{sender_name}`,
  },
];

function joinNames(names: string[]) {
  const c = names.filter(Boolean);
  if (c.length <= 1) return c[0] || 'all';
  return `${c.slice(0, -1).join(', ')} and ${c[c.length - 1]}`;
}

function applyVars(t: string, v: Record<string, string>) {
  return Object.entries(v).reduce((acc, [k, val]) => acc.split(`{${k}}`).join(val), t);
}

export function PartnerMilestoneEmailDialog({
  open, onOpenChange, leadId, brokerId, clientName, clientEmail, dealName, financeDueDate,
  recipients, initialMilestone = 'introduction', isPreview,
}: Props) {
  const { user } = useAuth();
  const [milestone, setMilestone] = useState<PartnerMilestoneKey>(initialMilestone);
  const [selected, setSelected] = useState<string[]>([]);
  const [ccClient, setCcClient] = useState(false);
  const [extraTo, setExtraTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [brokerName, setBrokerName] = useState('');
  const [sender, setSender] = useState<{ name: string; email: string; signature: string; sigImg: string | null }>({ name: '', email: '', signature: '', sigImg: null });

  useEffect(() => { if (open) setMilestone(initialMilestone); }, [open, initialMilestone]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: bp }, { data: sp }] = await Promise.all([
        brokerId ? supabase.from('profiles').select('full_name,email').eq('user_id', brokerId).maybeSingle() : Promise.resolve({ data: null } as any),
        user?.id ? supabase.from('profiles').select('full_name,email,email_signature,email_signature_image_url').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null } as any),
      ]);
      const bName = bp?.full_name || 'Your Broker';
      setBrokerName(bName);
      setSender({
        name: sp?.full_name || bName,
        email: sp?.email || user?.email || bp?.email || '',
        signature: (sp as any)?.email_signature || '',
        sigImg: (sp as any)?.email_signature_image_url || null,
      });
    })();
  }, [open, brokerId, user?.id, user?.email]);

  const def = MILESTONES.find((m) => m.key === milestone)!;

  // Reset recipients when milestone changes
  useEffect(() => {
    if (!open) return;
    setSelected(recipients.filter((r) => def.defaultTo(r.role)).map((r) => r.linkId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, milestone, recipients.length]);

  const chosen = useMemo(() => recipients.filter((r) => selected.includes(r.linkId)), [recipients, selected]);

  // Regenerate draft when milestone / recipients / sender change — only until the user edits it
  const [edited, setEdited] = useState(false);
  useEffect(() => { setEdited(false); }, [open, milestone]);
  const chosenKey = chosen.map((c) => c.linkId).join(',');
  useEffect(() => {
    if (!open || edited) return;
    const vars = {
      recipient_names: joinNames(chosen.map((c) => c.firstName)),
      client_name: clientName || 'our client',
      deal_suffix: dealName ? ` (${dealName})` : '',
      finance_due_date: financeDueDate ? format(parseISO(financeDueDate), 'EEEE d MMMM yyyy') : 'to be confirmed',
      broker_name: brokerName || sender.name,
      sender_name: sender.name || brokerName,
    };
    setSubject(applyVars(def.subject, vars));
    setBody(applyVars(def.body, vars));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, milestone, chosenKey, clientName, dealName, financeDueDate, brokerName, sender.name, edited]);

  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const send = async () => {
    const to = [...chosen.map((c) => c.email), ...extraTo.split(',').map((s) => s.trim()).filter(Boolean)];
    const uniq = Array.from(new Set(to.map((e) => e.toLowerCase())));
    if (!uniq.length) { toast.error('Choose at least one recipient'); return; }
    if (isPreview) { toast.info('Preview mode — email not sent'); return; }
    setSending(true);
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const sigText = sender.signature.trim() ? `<div style="white-space:pre-wrap">${esc(sender.signature)}</div>` : '';
    const sigImg = sender.sigImg ? `<div style="margin-top:8px"><img src="${sender.sigImg}" alt="" style="max-height:80px;max-width:300px;display:block" /></div>` : '';
    const sigBlock = sigText || sigImg ? `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;color:#374151">${sigText}${sigImg}</div>` : '';
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111"><div style="white-space:pre-wrap">${esc(body)}</div>${sigBlock}</div>`;
    const fromName = (sender.name || brokerName || 'Margin Finance').replace(/[<>]/g, '').trim();
    const replyTo = sender.email.trim() || undefined;
    const fromEmail = replyTo?.toLowerCase().endsWith('@margin.com.au') ? replyTo : 'notifications@margin.com.au';
    const cc = ccClient && clientEmail ? [clientEmail] : undefined;

    const { error } = await supabase.functions.invoke('send-email', {
      body: { to: uniq, subject, html, from: `${fromName} <${fromEmail}>`, cc, reply_to: replyTo },
    });
    setSending(false);
    if (error) { toast.error(error.message || 'Failed to send'); return; }
    const names = chosen.map((c) => `${c.name} (${c.roleLabel})`);
    const extras = uniq.filter((e) => !chosen.some((c) => c.email.toLowerCase() === e));
    await logAudit(
      leadId,
      `📧 Partner update sent (${def.label}) to ${[...names, ...extras].join(', ')}${cc ? ` · CC client ${clientEmail}` : ''} · Subject: "${subject}"`,
    );
    toast.success('Email sent');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email conveyancer / agent</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Milestone</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-1">
              {MILESTONES.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMilestone(m.key)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors',
                      milestone === m.key ? 'border-primary bg-primary/10 text-foreground font-medium' : 'border-border hover:bg-muted/50 text-muted-foreground',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs">Send to</Label>
            {recipients.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">
                No professional contacts with an email are linked to this deal. Add the conveyancer or agent in Professional Contacts, or type an email below.
              </p>
            ) : (
              <div className="space-y-1.5 mt-1">
                {recipients.map((r) => (
                  <label key={r.linkId} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={selected.includes(r.linkId)} onCheckedChange={() => toggle(r.linkId)} />
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground text-xs">· {r.roleLabel} · {r.email}</span>
                  </label>
                ))}
              </div>
            )}
            <Input className="mt-2 h-9" value={extraTo} onChange={(e) => setExtraTo(e.target.value)} placeholder="Other emails (comma separated, optional)" />
            <label className={cn('flex items-center gap-2 text-sm mt-2', clientEmail ? 'cursor-pointer' : 'opacity-50')}>
              <Checkbox checked={ccClient} disabled={!clientEmail} onCheckedChange={(v) => setCcClient(!!v)} />
              CC the client{clientEmail ? ` (${clientEmail})` : ' — no email on file'}
            </label>
          </div>

          <div>
            <Label className="text-xs">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Message</Label>
            <Textarea rows={11} value={body} onChange={(e) => setBody(e.target.value)} />
            <p className="text-[11px] text-muted-foreground mt-1">Your email signature is added automatically. Replies come back to {sender.email || 'you'}.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={sending}>{sending ? 'Sending…' : 'Send email'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
