import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send } from 'lucide-react';
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

  useEffect(() => {
    if (!open || !lead.broker_id) return;
    (async () => {
      const [{ data: tpls }, { data: settings }, { data: brokerProfile }] = await Promise.all([
        supabase.from('milestone_email_templates').select('*').eq('broker_id', lead.broker_id),
        supabase.from('broker_email_settings').select('*').eq('broker_id', lead.broker_id).maybeSingle(),
        supabase.from('profiles').select('full_name,email').eq('user_id', lead.broker_id).maybeSingle(),
      ]);
      const bName = brokerProfile?.full_name || 'Your Broker';
      const bEmail = brokerProfile?.email || '';
      setBrokerName(bName);
      setBrokerEmail(bEmail);
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
      setTo(lead.email || '');
    })();
  }, [open, milestone, lead.broker_id, lead.email, lead.first_name, lead.last_name, lead.opportunity_name, lead.loan_amount]);

  const send = async () => {
    if (!to.trim()) { toast.error('Recipient email required'); return; }
    setSending(true);
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111;white-space:pre-wrap">${
      body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }</div>`;
    const fromName = brokerName || 'Margin Finance';
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: to.trim(),
        subject,
        html,
        from: `${fromName} <notifications@margin.com.au>`,
        bcc: bcc.trim() || undefined,
        reply_to: brokerEmail || undefined,
      },
    });
    if (error) {
      toast.error(error.message || 'Failed to send');
      setSending(false);
      return;
    }
    // Audit note
    const m = MILESTONES.find((x) => x.key === milestone);
    await supabase.from('notes').insert({
      lead_id: lead.id,
      content: `📧 Milestone email sent (${m?.label}) to ${to}${bcc ? ` · BCC ${bcc}` : ''}`,
      author_id: user?.id ?? null,
    } as any);
    toast.success('Email sent');
    setSending(false);
    setOpen(false);
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
              <Input value={to} onChange={(e) => setTo(e.target.value)} type="email" />
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
