import { useEffect, useState } from 'react';
import { format, differenceInCalendarDays, addDays, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldAlert, CalendarIcon, MailPlus, Clock, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { logAudit } from '@/lib/leadAudit';

interface ProContact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  type?: string | null;
}

interface LinkedRow { id: string; contact_id: string; role: string; }

interface ExtensionRow {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  recipient_role: string | null;
  requested_days: number;
  proposed_new_date: string | null;
  previous_due_date: string | null;
  sent_at: string;
}

interface Props {
  leadId: string;
  subjectToFinance: boolean;
  financeDueDate: string | null;
  contacts: ProContact[];
  isPreviewMode?: boolean;
  onChange: (updates: { subject_to_finance?: boolean; finance_due_date?: string | null }) => void;
}

const ROLE_LABEL: Record<string, string> = {
  solicitor: 'Solicitor', conveyancer: 'Conveyancer', accountant: 'Accountant',
  financial_planner: 'Financial Planner', buyers_agent: "Buyer's Agent", other: 'Other',
};

export function SubjectToFinanceSection({
  leadId, subjectToFinance, financeDueDate, contacts, isPreviewMode = false, onChange,
}: Props) {
  const { user } = useAuth();
  const [proRows, setProRows] = useState<LinkedRow[]>([]);
  const [extensions, setExtensions] = useState<ExtensionRow[]>([]);
  const [savingDate, setSavingDate] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [days, setDays] = useState<number>(14);
  const [recipientId, setRecipientId] = useState<string>('');
  const [overrideEmail, setOverrideEmail] = useState('');
  const [overrideName, setOverrideName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const isPreviewLead = isPreviewMode || leadId.startsWith('preview-');

  const loadLinks = async () => {
    if (isPreviewLead) { setProRows([]); setExtensions([]); return; }
    const [a, b] = await Promise.all([
      supabase.from('lead_professional_contacts' as any).select('id, contact_id, role').eq('lead_id', leadId),
      supabase.from('lead_finance_extensions' as any).select('id, recipient_email, recipient_name, recipient_role, requested_days, proposed_new_date, previous_due_date, sent_at')
        .eq('lead_id', leadId).order('sent_at', { ascending: false }),
    ]);
    setProRows((a.data as any) || []);
    setExtensions((b.data as any) || []);
  };

  useEffect(() => { loadLinks(); /* eslint-disable-next-line */ }, [leadId, subjectToFinance]);

  // Eligible legal contacts (solicitor / conveyancer first, then any other linked pro contact).
  const legalLinks = proRows
    .map(r => ({ row: r, contact: contacts.find(c => c.id === r.contact_id) }))
    .filter(x => !!x.contact && !!x.contact!.email);
  const sortedLegal = [...legalLinks].sort((a, b) => {
    const score = (r: string) => (r === 'solicitor' || r === 'conveyancer') ? 0 : 1;
    return score(a.row.role) - score(b.row.role);
  });

  useEffect(() => {
    if (dialogOpen && !recipientId && sortedLegal.length > 0) {
      setRecipientId(sortedLegal[0].row.id);
    }
  }, [dialogOpen, sortedLegal, recipientId]);

  const dueDateObj = financeDueDate ? parseISO(financeDueDate) : null;
  const daysUntilDue = dueDateObj ? differenceInCalendarDays(dueDateObj, new Date()) : null;

  const tone = (() => {
    if (!subjectToFinance || daysUntilDue === null) return 'neutral';
    if (daysUntilDue < 0) return 'past';
    if (daysUntilDue <= 3) return 'urgent';
    if (daysUntilDue <= 7) return 'soon';
    return 'ok';
  })();

  const cardClasses = cn(
    'rounded-xl border-2 shadow-md overflow-hidden mb-3',
    tone === 'past' && 'border-destructive/40 bg-gradient-to-br from-destructive/10 via-background to-background',
    tone === 'urgent' && 'border-destructive/40 bg-gradient-to-br from-destructive/10 via-background to-background',
    tone === 'soon' && 'border-amber-400/50 bg-gradient-to-br from-amber-100/50 via-background to-background',
    tone === 'ok' && 'border-success/30 bg-gradient-to-br from-success/10 via-background to-background',
    tone === 'neutral' && 'border-border bg-muted/20',
  );

  const headerClasses = cn(
    'flex items-center justify-between px-4 py-3 border-b',
    tone === 'past' || tone === 'urgent' ? 'bg-destructive/10 border-destructive/20' :
    tone === 'soon' ? 'bg-amber-100/60 border-amber-300/40' :
    tone === 'ok' ? 'bg-success/10 border-success/20' :
    'bg-muted/40 border-border',
  );

  const iconBg = cn(
    'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
    tone === 'past' || tone === 'urgent' ? 'bg-destructive text-destructive-foreground' :
    tone === 'soon' ? 'bg-amber-500 text-white' :
    tone === 'ok' ? 'bg-success text-success-foreground' :
    'bg-muted text-muted-foreground',
  );

  const updateLead = async (updates: { subject_to_finance?: boolean; finance_due_date?: string | null }) => {
    onChange(updates);
    if (isPreviewLead) return;
    await supabase.from('leads').update(updates as any).eq('id', leadId);
  };

  const toggle = async (val: boolean) => {
    await updateLead({ subject_to_finance: val });
    await logAudit(leadId, val ? '💰 Marked deal as Subject to Finance' : '💰 Removed Subject to Finance flag', { isPreview: isPreviewLead });
  };

  const setDate = async (d: Date | undefined) => {
    setSavingDate(true);
    setDatePickerOpen(false);
    const prev = financeDueDate ? format(parseISO(financeDueDate), 'dd MMM yyyy') : 'none';
    const nextLabel = d ? format(d, 'dd MMM yyyy') : 'cleared';
    await updateLead({ finance_due_date: d ? format(d, 'yyyy-MM-dd') : null });
    await logAudit(leadId, `💰 Finance due date ${prev === 'none' ? 'set to' : 'changed:'} ${prev} → ${nextLabel}`, { isPreview: isPreviewLead });
    setSavingDate(false);
  };

  const proposedNewDate = (() => {
    if (!dueDateObj || !days) return null;
    return addDays(dueDateObj, days);
  })();

  const handleSend = async () => {
    const link = sortedLegal.find(l => l.row.id === recipientId);
    const email = (overrideEmail || link?.contact?.email || '').trim();
    const name = overrideName || (link ? `${link.contact!.first_name} ${link.contact!.last_name}` : '');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Valid recipient email required'); return; }
    if (!days || days < 1) { toast.error('Enter a number of days (1+)'); return; }

    if (isPreviewLead) {
      toast.success(`Extension request sent (preview) — ${days} day${days === 1 ? '' : 's'}`);
      setDialogOpen(false);
      return;
    }

    setSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    const fromEmail = (user?.email || 'notifications@margin.com.au');
    const { data, error } = await supabase.functions.invoke('send-finance-extension', {
      body: {
        lead_id: leadId,
        recipient_email: email,
        recipient_name: name || null,
        recipient_role: link?.row.role || null,
        recipient_contact_id: link?.contact?.id || null,
        current_due_date: financeDueDate,
        requested_days: days,
        proposed_new_date: proposedNewDate ? format(proposedNewDate, 'yyyy-MM-dd') : null,
        message: message.trim() || null,
        from_email: fromEmail,
        from_name: (session?.user?.user_metadata as any)?.full_name || undefined,
      },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast.error(`Failed to send: ${error?.message || (data as any)?.error}`);
      return;
    }
    toast.success(`Extension request emailed to ${name || email}`);
    await logAudit(leadId, `💰 Finance extension request sent — ${days} day${days === 1 ? '' : 's'} → ${name || email}${link?.row.role ? ` (${ROLE_LABEL[link.row.role] || link.row.role})` : ''}${proposedNewDate ? `\nProposed new date: ${format(proposedNewDate, 'dd MMM yyyy')}` : ''}${message.trim() ? `\n\n"${message.trim().slice(0, 280)}"` : ''}`, { isPreview: isPreviewLead });
    setDialogOpen(false);
    setMessage('');
    loadLinks();
  };

  return (
    <div className={cardClasses}>
      <div className={headerClasses}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={iconBg}><ShieldAlert className="w-4 h-4" /></div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground leading-tight">Subject to Finance</h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {!subjectToFinance ? 'Not flagged' :
                !dueDateObj ? 'No finance due date set' :
                tone === 'past' ? <span className="text-destructive font-semibold">Overdue by {Math.abs(daysUntilDue!)} day{Math.abs(daysUntilDue!) === 1 ? '' : 's'}</span> :
                daysUntilDue === 0 ? <span className="text-destructive font-semibold">Due today</span> :
                <span>{daysUntilDue} day{daysUntilDue === 1 ? '' : 's'} remaining · due {format(dueDateObj, 'EEE, dd MMM yyyy')}</span>
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Label htmlFor="stf-toggle" className="text-xs text-muted-foreground">Active</Label>
          <Switch id="stf-toggle" checked={subjectToFinance} onCheckedChange={toggle} />
        </div>
      </div>

      {subjectToFinance && (
        <div className="p-3 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs flex items-center gap-1.5 mb-1">
                <CalendarIcon className="w-3 h-3" /> Finance due date
              </Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal h-9', !dueDateObj && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDateObj ? format(dueDateObj, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100]" align="start">
                  <Calendar mode="single" selected={dueDateObj || undefined} onSelect={setDate}
                    initialFocus className={cn('p-3 pointer-events-auto')} />
                </PopoverContent>
              </Popover>
            </div>
            <Button
              onClick={() => setDialogOpen(true)}
              className="gap-2 h-9"
              disabled={savingDate}
            >
              <MailPlus className="w-4 h-4" /> Request Extension
            </Button>
          </div>

          {extensions.length > 0 && (
            <div className="rounded-md border border-border bg-background/60 p-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                <History className="w-3 h-3" /> Extension requests ({extensions.length})
              </div>
              {extensions.slice(0, 3).map(e => (
                <div key={e.id} className="text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    <span className="font-medium text-foreground">{e.requested_days} day{e.requested_days === 1 ? '' : 's'}</span>
                    {' → '}{e.recipient_name || e.recipient_email}
                    {e.recipient_role && <span className="opacity-70"> ({ROLE_LABEL[e.recipient_role] || e.recipient_role})</span>}
                    {' · '}{format(parseISO(e.sent_at), 'dd MMM, h:mma')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Finance Extension</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            {sortedLegal.length > 0 ? (
              <div>
                <Label className="text-xs">Send to</Label>
                <Select value={recipientId} onValueChange={setRecipientId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select solicitor / conveyancer" /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    {sortedLegal.map(l => (
                      <SelectItem key={l.row.id} value={l.row.id}>
                        {l.contact!.first_name} {l.contact!.last_name} · {ROLE_LABEL[l.row.role] || l.row.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {sortedLegal.find(l => l.row.id === recipientId)?.contact?.email}
                </p>
              </div>
            ) : (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900">
                No solicitor or conveyancer linked to this deal yet. Add one in the Professional Contacts section, or enter an email manually below.
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Override name</Label>
                <Input value={overrideName} onChange={e => setOverrideName(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label className="text-xs">Override email</Label>
                <Input type="email" value={overrideEmail} onChange={e => setOverrideEmail(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Days requested *</Label>
              <Input type="number" min={1} max={365} value={days}
                onChange={e => setDays(Math.max(1, Math.min(365, parseInt(e.target.value || '0', 10))))} />
              {dueDateObj && proposedNewDate && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Proposed new finance due date: <span className="font-medium text-foreground">{format(proposedNewDate, 'EEE, dd MMM yyyy')}</span>
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs">Message (optional)</Label>
              <Textarea rows={4} value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Add any context for the solicitor / conveyancer…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending || days < 1}>
              {sending ? 'Sending…' : 'Send Extension Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
