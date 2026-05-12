import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/leadAudit';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { MILESTONES } from './MilestoneEmailsManagement';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  opportunity_name?: string | null;
  loan_amount: number | null;
  broker_id: string | null;
}

interface Props {
  lead: Lead;
}

function applyVars(text: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.split(`{${k}}`).join(v ?? ''),
    text || ''
  );
}

interface Attachment {
  filename: string;
  content: string; // base64
  content_type: string;
  size: number;
}

const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // 20MB Resend limit

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function SendMilestoneEmailDialog({ lead }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [milestone, setMilestone] = useState<string>('lodged');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [to, setTo] = useState(lead.email || '');
  const [bcc, setBcc] = useState('');
  const [sending, setSending] = useState(false);
  const [brokerName, setBrokerName] = useState('');
  const [brokerEmail, setBrokerEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (!open || !lead.broker_id) return;
    (async () => {
      const [{ data: tpls }, { data: settings }, { data: brokerProfile }, { data: applicants }, { data: senderProfile }] = await Promise.all([
        supabase.from('milestone_email_templates').select('*').eq('broker_id', lead.broker_id),
        supabase.from('broker_email_settings').select('*').eq('broker_id', lead.broker_id).maybeSingle(),
        supabase.from('profiles').select('full_name,email').eq('user_id', lead.broker_id).maybeSingle(),
        supabase.from('lead_applicants').select('email,name').eq('lead_id', lead.id),
        user?.id ? supabase.from('profiles').select('full_name,email').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const bName = brokerProfile?.full_name || 'Your Broker';
      const bEmail = brokerProfile?.email || '';
      setBrokerName(bName);
      setBrokerEmail(bEmail);
      setSenderName(senderProfile?.full_name || bName);
      setSenderEmail(senderProfile?.email || user?.email || bEmail);
      setBcc(settings?.milestone_bcc_email || '');
      const vars = {
        first_name: lead.first_name || '',
        last_name: lead.last_name || '',
        opportunity_name: lead.opportunity_name || '',
        loan_amount: lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : '',
        broker_name: bName,
      };
      const tpl = (tpls || []).find((t: any) => t.milestone === milestone);
      const m = MILESTONES.find((x) => x.key === milestone);
      const defaultSubject = `Update on your loan — ${m?.label}`;
      const defaultBody = `Hi {first_name},\n\nYour loan has reached the ${m?.label} stage.\n\nKind regards,\n{broker_name}`;
      setSubject(applyVars(tpl?.subject || defaultSubject, vars));
      setBody(applyVars(tpl?.body || defaultBody, vars));
      const emails = new Set<string>();
      if (lead.email) emails.add(lead.email.trim());
      (applicants || []).forEach((a: any) => {
        if (a.email && a.email.trim()) emails.add(a.email.trim());
      });
      setTo(Array.from(emails).join(', '));
    })();
  }, [open, milestone, lead.id, lead.broker_id, lead.email, lead.first_name, lead.last_name, lead.opportunity_name, lead.loan_amount]);

  const send = async () => {
    if (!to.trim()) { toast.error('Recipient email required'); return; }
    setSending(true);
    const recipients = to.split(',').map((s) => s.trim()).filter(Boolean);
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111;white-space:pre-wrap">${
      body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }</div>`;
    const fromName = senderName || brokerName || 'Margin Finance';
    const replyTo = senderEmail || brokerEmail || undefined;
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: recipients,
        subject,
        html,
        from: `${fromName} <notifications@margin.com.au>`,
        bcc: bcc.trim() || undefined,
        reply_to: replyTo,
        attachments: attachments.length
          ? attachments.map((a) => ({ filename: a.filename, content: a.content, content_type: a.content_type }))
          : undefined,
      },
    });
    if (error) {
      toast.error(error.message || 'Failed to send');
      setSending(false);
      return;
    }
    // Audit note → deal timeline
    const m = MILESTONES.find((x) => x.key === milestone);
    const attachNote = attachments.length ? ` · ${attachments.length} attachment(s): ${attachments.map(a => a.filename).join(', ')}` : '';
    await logAudit(
      lead.id,
      `📧 Milestone email sent (${m?.label}) to ${recipients.join(', ')}${bcc ? ` · BCC ${bcc}` : ''} · Subject: "${subject}"${attachNote}`,
    );
    toast.success('Email sent');
    setSending(false);
    setAttachments([]);
    setOpen(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    const next = [...attachments];
    let total = next.reduce((s, a) => s + a.size, 0);
    for (const file of files) {
      if (total + file.size > MAX_TOTAL_BYTES) {
        toast.error(`Skipped ${file.name} — total attachments exceed 20MB`);
        continue;
      }
      try {
        const content = await fileToBase64(file);
        next.push({ filename: file.name, content, content_type: file.type || 'application/octet-stream', size: file.size });
        total += file.size;
      } catch {
        toast.error(`Failed to read ${file.name}`);
      }
    }
    setAttachments(next);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Mail className="w-4 h-4" /> Milestone email
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send milestone email</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Milestone</Label>
              <Select value={milestone} onValueChange={setMilestone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MILESTONES.map((m) => (
                    <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="comma-separated emails" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>BCC</Label>
            <Input value={bcc} onChange={(e) => setBcc(e.target.value)} type="email" placeholder="aggregator compliance" />
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Body</Label>
            <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Attachments</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  <Paperclip className="w-4 h-4 mr-1.5" /> Add files
                  <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                </label>
              </Button>
              <span className="text-xs text-muted-foreground">Max 20MB total</span>
            </div>
            {attachments.length > 0 && (
              <ul className="space-y-1 mt-2">
                {attachments.map((a, i) => (
                  <li key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1">
                    <span className="truncate">{a.filename} <span className="text-xs text-muted-foreground">({(a.size / 1024).toFixed(1)} KB)</span></span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={send} disabled={sending}>
            <Send className="w-4 h-4 mr-2" /> {sending ? 'Sending…' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
