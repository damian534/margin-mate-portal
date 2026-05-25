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
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Send, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_MILESTONES } from './MilestoneEmailsManagement';

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

function joinNames(names: string[]): string {
  const clean = names.map((n) => (n || '').trim()).filter(Boolean);
  if (clean.length === 0) return '';
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(', ')} and ${clean[clean.length - 1]}`;
}

interface ApplicantOption {
  id: string;
  firstName: string;
  fullName: string;
  email: string;
}

interface Attachment {
  filename: string;
  content: string; // base64
  content_type: string;
  size: number;
  fromTemplate?: boolean;
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
  const [milestoneOptions, setMilestoneOptions] = useState<{ key: string; label: string }[]>(
    DEFAULT_MILESTONES.map((m) => ({ key: m.key, label: m.label }))
  );
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [to, setTo] = useState(lead.email || '');
  const [bcc, setBcc] = useState('');
  const [cc, setCc] = useState('');
  const [sending, setSending] = useState(false);
  const [brokerName, setBrokerName] = useState('');
  const [brokerEmail, setBrokerEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderSignature, setSenderSignature] = useState('');
  const [senderSignatureImage, setSenderSignatureImage] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [applicantOptions, setApplicantOptions] = useState<ApplicantOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [combinedFirstName, setCombinedFirstName] = useState('');

  useEffect(() => {
    if (!open || !lead.broker_id) return;
    (async () => {
      const [{ data: tpls }, { data: settings }, { data: brokerProfile }, { data: applicants }, { data: senderProfile }] = await Promise.all([
        supabase.from('milestone_email_templates').select('*').eq('broker_id', lead.broker_id),
        supabase.from('broker_email_settings').select('*').eq('broker_id', lead.broker_id).maybeSingle(),
        supabase.from('profiles').select('full_name,email').eq('user_id', lead.broker_id).maybeSingle(),
        supabase.from('lead_applicants').select('id,email,name').eq('lead_id', lead.id).order('display_order', { ascending: true }),
        user?.id ? supabase.from('profiles').select('full_name,email,email_signature,email_signature_image_url').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      // Build milestone options: defaults + any custom rows from DB
      const opts: { key: string; label: string }[] = DEFAULT_MILESTONES.map((m) => {
        const t = (tpls || []).find((x: any) => x.milestone === m.key);
        return { key: m.key, label: t?.label || m.label };
      });
      for (const t of (tpls || []) as any[]) {
        if (DEFAULT_MILESTONES.find((m) => m.key === t.milestone)) continue;
        opts.push({ key: t.milestone, label: t.label || t.milestone });
      }
      setMilestoneOptions(opts);
      const bName = brokerProfile?.full_name || 'Your Broker';
      const bEmail = brokerProfile?.email || '';
      setBrokerName(bName);
      setBrokerEmail(bEmail);
      setSenderName(senderProfile?.full_name || bName);
      setSenderEmail(senderProfile?.email || user?.email || bEmail);
      setSenderSignature((senderProfile as any)?.email_signature || '');
      setSenderSignatureImage((senderProfile as any)?.email_signature_image_url || null);
      setBcc(settings?.milestone_bcc_email || '');

      // Build applicant options: primary lead first, then co-applicants
      const opts: ApplicantOption[] = [];
      const seenEmails = new Set<string>();
      const primaryEmail = (lead.email || '').trim();
      opts.push({
        id: 'primary',
        firstName: lead.first_name || '',
        fullName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
        email: primaryEmail,
      });
      if (primaryEmail) seenEmails.add(primaryEmail.toLowerCase());
      (applicants || []).forEach((a: any) => {
        const em = (a.email || '').trim();
        const key = em.toLowerCase();
        if (em && seenEmails.has(key)) return;
        if (em) seenEmails.add(key);
        const first = (a.name || '').trim().split(/\s+/)[0] || '';
        opts.push({
          id: a.id,
          firstName: first,
          fullName: a.name || '',
          email: em,
        });
      });
      setApplicantOptions(opts);
      const defaultSelected = opts.filter((o) => o.email).map((o) => o.id);
      const initialSelected = defaultSelected.length ? defaultSelected : opts.map((o) => o.id);
      setSelectedIds(initialSelected);

      const selectedOpts = opts.filter((o) => initialSelected.includes(o.id));
      const combinedFirst = joinNames(selectedOpts.map((o) => o.firstName)) || lead.first_name || '';
      setCombinedFirstName(combinedFirst);
      const combinedLast = joinNames(selectedOpts.map((o) => (o.fullName.split(/\s+/).slice(1).join(' ') || '').trim())) || lead.last_name || '';
      const vars = {
        first_name: combinedFirst,
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
      setTo(selectedOpts.map((o) => o.email).filter(Boolean).join(', '));
    })();
  }, [open, milestone, lead.id, lead.broker_id, lead.email, lead.first_name, lead.last_name, lead.opportunity_name, lead.loan_amount, user?.id, user?.email]);

  const toggleApplicant = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      const selectedOpts = applicantOptions.filter((o) => next.includes(o.id));
      setTo(selectedOpts.map((o) => o.email).filter(Boolean).join(', '));
      const combinedFirst = joinNames(selectedOpts.map((o) => o.firstName)) || lead.first_name || '';
      setCombinedFirstName(combinedFirst);
      const vars = {
        first_name: combinedFirst,
        last_name: lead.last_name || '',
        opportunity_name: lead.opportunity_name || '',
        loan_amount: lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : '',
        broker_name: brokerName,
      };
      // Re-apply current template to refresh first_name in body/subject
      (async () => {
        if (!lead.broker_id) return;
        const { data: tpls } = await supabase.from('milestone_email_templates').select('*').eq('broker_id', lead.broker_id).eq('milestone', milestone).maybeSingle();
        const m = MILESTONES.find((x) => x.key === milestone);
        const defaultSubject = `Update on your loan — ${m?.label}`;
        const defaultBody = `Hi {first_name},\n\nYour loan has reached the ${m?.label} stage.\n\nKind regards,\n{broker_name}`;
        setSubject(applyVars((tpls as any)?.subject || defaultSubject, vars));
        setBody(applyVars((tpls as any)?.body || defaultBody, vars));
      })();
      return next;
    });
  };

  const ccBroker = () => {
    const email = (brokerEmail || '').trim();
    if (!email) { toast.error('No broker email on file'); return; }
    const existing = cc.split(',').map((s) => s.trim()).filter(Boolean);
    if (existing.some((e) => e.toLowerCase() === email.toLowerCase())) {
      toast.info('Broker already CC\'d');
      return;
    }
    setCc([...existing, email].join(', '));
  };

  const send = async () => {
    const selectedOpts = applicantOptions.filter((o) => selectedIds.includes(o.id) && o.email);
    const manualRecipients = to.split(',').map((s) => s.trim()).filter(Boolean);
    // Build per-recipient sends: each selected applicant gets a personalized email.
    // Any extra addresses typed manually in "To" that don't match an applicant
    // get the combined-name version.
    type Send = { email: string; firstName: string };
    const sends: Send[] = [];
    const seen = new Set<string>();
    for (const o of selectedOpts) {
      const key = o.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      sends.push({ email: o.email, firstName: o.firstName || combinedFirstName });
    }
    for (const em of manualRecipients) {
      const key = em.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      sends.push({ email: em, firstName: combinedFirstName });
    }
    if (sends.length === 0) { toast.error('Recipient email required'); return; }
    setSending(true);
    const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const hasSig = senderSignature.trim() || senderSignatureImage;
    const sigImg = senderSignatureImage
      ? `<div style="margin-top:8px"><img src="${senderSignatureImage}" alt="" style="max-height:80px;max-width:300px;display:block" /></div>`
      : '';
    const sigText = senderSignature.trim()
      ? `<div style="white-space:pre-wrap">${escape(senderSignature)}</div>`
      : '';
    const sigBlock = hasSig
      ? `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;color:#374151">${sigText}${sigImg}</div>`
      : '';
    const fromName = (senderName || brokerName || 'Margin Finance').replace(/[<>]/g, '').trim();
    const replyTo = (senderEmail || brokerEmail || '').trim() || undefined;
    const fromEmail = replyTo?.toLowerCase().endsWith('@margin.com.au') ? replyTo : 'notifications@margin.com.au';

    // Personalize per recipient by swapping the combined first-name token
    // with the individual applicant's first name (mirrors how MIR sends one
    // tailored email per applicant).
    const personalize = (text: string, firstName: string) => {
      if (!combinedFirstName || combinedFirstName === firstName) return text;
      return text.split(combinedFirstName).join(firstName);
    };

    const ccList = cc.trim() ? cc.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    const results = await Promise.all(sends.map(async (s) => {
      const personalBody = personalize(body, s.firstName);
      const personalSubject = personalize(subject, s.firstName);
      const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111"><div style="white-space:pre-wrap">${escape(personalBody)}</div>${sigBlock}</div>`;
      return supabase.functions.invoke('send-email', {
        body: {
          to: [s.email],
          subject: personalSubject,
          html,
          from: `${fromName} <${fromEmail}>`,
          bcc: bcc.trim() || undefined,
          cc: ccList,
          reply_to: replyTo,
          attachments: attachments.length
            ? attachments.map((a) => ({ filename: a.filename, content: a.content, content_type: a.content_type }))
            : undefined,
        },
      });
    }));
    const firstError = results.find((r) => r.error);
    if (firstError?.error) {
      toast.error(firstError.error.message || 'Failed to send');
      setSending(false);
      return;
    }
    const recipients = sends.map((s) => s.email);
    // Audit note → deal timeline
    const m = MILESTONES.find((x) => x.key === milestone);
    const attachNote = attachments.length ? ` · ${attachments.length} attachment(s): ${attachments.map(a => a.filename).join(', ')}` : '';
    await logAudit(
      lead.id,
      `📧 Milestone email sent (${m?.label}) to ${recipients.join(', ')}${cc ? ` · CC ${cc}` : ''}${bcc ? ` · BCC ${bcc}` : ''} · Subject: "${subject}"${attachNote}`,
    );
    toast.success(sends.length > 1 ? `Sent ${sends.length} personalized emails` : 'Email sent');
    setSending(false);
    setAttachments([]);
    setCc('');
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
          {applicantOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label>Recipients</Label>
              <div className="space-y-1.5 rounded-md border p-3">
                {applicantOptions.map((o) => {
                  const checked = selectedIds.includes(o.id);
                  return (
                    <div
                      key={o.id}
                      role="button"
                      onClick={() => toggleApplicant(o.id)}
                      className="flex items-center gap-2 cursor-pointer select-none text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => toggleApplicant(o.id)}
                      />
                      <span className="font-medium">{o.fullName || '(no name)'}</span>
                      <span className="text-muted-foreground">{o.email || '— no email'}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">First names of selected applicants are merged into the email body.</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>BCC</Label>
            <Input value={bcc} onChange={(e) => setBcc(e.target.value)} type="email" placeholder="aggregator compliance" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>CC</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={ccBroker}
                disabled={!brokerEmail}
              >
                CC broker{brokerEmail ? ` (${brokerEmail})` : ''}
              </Button>
            </div>
            <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="comma-separated emails" />
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
