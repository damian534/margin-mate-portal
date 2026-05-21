import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Send, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Applicant { id: string; name: string; email?: string | null; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leadId: string;
  applicants: Applicant[];
  defaultLender?: string;
  isPreviewMode: boolean;
  onSent: () => void;
}

const FALLBACK_FROM = { email: 'apply@margin.com.au', name: 'Margin Finance' };

export function RequestMirDialog({ open, onOpenChange, leadId, applicants, defaultLender, isPreviewMode, onSent }: Props) {
  const { user } = useAuth();
  const [applicantIds, setApplicantIds] = useState<string[]>(applicants[0]?.id ? [applicants[0].id] : []);
  const [lender, setLender] = useState(defaultLender || '');
  const [message, setMessage] = useState('');
  const [docs, setDocs] = useState<{ name: string; section: string }[]>([{ name: '', section: 'Bank MIR' }]);
  const [fromOption, setFromOption] = useState<'me' | 'broker'>('me');
  const [myProfile, setMyProfile] = useState<{ email: string | null; name: string | null }>({ email: null, name: null });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setApplicantIds(applicants[0]?.id ? [applicants[0].id] : []);
    setLender(defaultLender || '');
    setMessage('');
    setDocs([{ name: '', section: 'Bank MIR' }]);
    setFromOption('me');
  }, [open, applicants, defaultLender]);

  useEffect(() => {
    if (!user || isPreviewMode) return;
    supabase.from('profiles').select('email, full_name').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      setMyProfile({ email: (data as any)?.email || user.email || null, name: (data as any)?.full_name || null });
    });
  }, [user, isPreviewMode]);

  const fromOptions = useMemo(() => {
    const mine = myProfile.email || user?.email || null;
    return [
      { value: 'me', label: mine ? `${myProfile.name || 'Me'} <${mine}>` : 'My account', email: mine, name: myProfile.name || 'Margin Finance' },
      { value: 'broker', label: `${FALLBACK_FROM.name} <${FALLBACK_FROM.email}>`, email: FALLBACK_FROM.email, name: FALLBACK_FROM.name },
    ];
  }, [myProfile, user]);

  const selectedApplicants = applicants.filter(a => applicantIds.includes(a.id));
  const missingEmailApplicants = selectedApplicants.filter(a => !a.email);
  const selectedFrom = fromOptions.find(f => f.value === fromOption) || fromOptions[1];

  const updateDoc = (i: number, key: 'name' | 'section', v: string) => setDocs(prev => prev.map((d, idx) => idx === i ? { ...d, [key]: v } : d));
  const addDoc = () => setDocs(prev => [...prev, { name: '', section: 'Bank MIR' }]);
  const removeDoc = (i: number) => setDocs(prev => prev.filter((_, idx) => idx !== i));

  const cleanedDocs = docs.map(d => ({ ...d, name: d.name.trim() })).filter(d => d.name.length > 0);
  const canSend = selectedApplicants.length > 0 && missingEmailApplicants.length === 0 && cleanedDocs.length > 0 && !!selectedFrom?.email;

  const toggleApplicant = (id: string) => {
    setApplicantIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    if (!canSend || selectedApplicants.length === 0) return;
    setSending(true);
    try {
      const batchId = crypto.randomUUID();
      const requestedAt = new Date().toISOString();

      // Resolve each selected applicant to a real DB UUID, creating the
      // primary applicant row if it's still the contact-card fallback.
      const resolved: { dbId: string; name: string; email: string }[] = [];
      for (const app of selectedApplicants) {
        let dbId = app.id;
        if (!isPreviewMode && dbId === 'contact-card-primary-applicant') {
          const { data: created, error: createErr } = await (supabase as any)
            .from('lead_applicants')
            .insert({
              lead_id: leadId,
              name: app.name,
              email: app.email ?? null,
              employment_type: 'PAYG',
              display_order: 0,
            })
            .select('id')
            .single();
          if (createErr || !created?.id) {
            toast.error('Could not create applicant record: ' + (createErr?.message || 'unknown error'));
            return;
          }
          dbId = created.id;
        }
        resolved.push({ dbId, name: app.name, email: app.email! });
      }

      if (!isPreviewMode) {
        // 1. Insert one document_requests row per applicant per document
        const rows = resolved.flatMap(r => cleanedDocs.map(d => ({
          lead_id: leadId,
          name: d.name,
          section: d.section || 'Bank MIR',
          applicant_id: r.dbId,
          is_mir: true,
          mir_batch_id: batchId,
          mir_requested_at: requestedAt,
          requested_at: requestedAt,
          status: 'pending',
        })));
        const { error: insErr } = await (supabase as any).from('document_requests').insert(rows);
        if (insErr) { toast.error('Could not create MIR docs: ' + insErr.message); return; }

        // 2. Log batch (single record covering all recipients)
        await (supabase as any).from('mir_requests').insert({
          id: batchId,
          lead_id: leadId,
          requested_by: user?.id ?? null,
          requested_at: requestedAt,
          lender: lender.trim() || null,
          message: message.trim() || null,
          from_email: selectedFrom.email!,
          from_name: selectedFrom.name || null,
          recipient_emails: resolved.map(r => r.email),
          document_count: cleanedDocs.length * resolved.length,
        });

        // 3. Send one email per applicant
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (accessToken) {
          await Promise.all(resolved.map(r => fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-mir-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({
              lead_id: leadId,
              app_url: 'https://connect.margin.com.au',
              document_names: cleanedDocs.map(d => d.name),
              recipient_email: r.email,
              recipient_name: r.name,
              lender: lender.trim() || undefined,
              message: message.trim() || undefined,
              from_email: selectedFrom.email!,
              from_name: selectedFrom.name || undefined,
              reply_to: selectedFrom.email!,
            }),
          })));
        }

        // 4. Timeline note
        try {
          const recipientList = resolved.map(r => r.name).join(' & ');
          const summary = `📨 MIR sent${lender.trim() ? ` (${lender.trim()})` : ''} to ${recipientList}\n${cleanedDocs.map(d => `• ${d.name}`).join('\n')}`;
          await supabase.from('notes').insert({ lead_id: leadId, content: summary, author_id: user?.id ?? null } as any);
        } catch {}
      }

      toast.success(`MIR sent to ${resolved.map(r => r.name).join(' & ')}`);
      onSent();
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold uppercase tracking-wide">MIR</span>
            Request additional documents from client
          </DialogTitle>
          <DialogDescription>
            Use this when the bank has come back asking for more information after lodgement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipients */}
          <div className="space-y-1.5">
            <Label className="text-xs">Send to applicant(s)</Label>
            <div className="space-y-1.5 border rounded-md p-2">
              {applicants.map(a => {
                const checked = applicantIds.includes(a.id);
                const disabled = !a.email;
                return (
                  <label key={a.id} className={`flex items-center gap-2 text-sm rounded px-1.5 py-1 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/50'}`}>
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={() => !disabled && toggleApplicant(a.id)}
                    />
                    <span className="flex-1">
                      <span className="font-medium">{a.name}</span>
                      {a.email ? <span className="text-muted-foreground"> — {a.email}</span> : <span className="text-muted-foreground"> (no email on file)</span>}
                    </span>
                  </label>
                );
              })}
            </div>
            {missingEmailApplicants.length > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Add an email to the selected applicant before sending.</p>
            )}
          </div>

          {/* Lender */}
          <div className="space-y-1.5">
            <Label className="text-xs">Lender (optional)</Label>
            <Input value={lender} onChange={e => setLender(e.target.value)} placeholder="e.g. CBA, Macquarie, Westpac" />
          </div>

          {/* From */}
          <div className="space-y-1.5">
            <Label className="text-xs">Send from</Label>
            <Select value={fromOption} onValueChange={(v: 'me' | 'broker') => setFromOption(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {fromOptions.map(o => (
                  <SelectItem key={o.value} value={o.value} disabled={!o.email}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Email is delivered through Margin's verified domain. The chosen address is set as Reply-To, so client replies go to you.</p>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label className="text-xs">Personal message (optional)</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Hi James, the bank has come back asking for…" />
          </div>

          {/* Docs */}
          <div className="space-y-2">
            <Label className="text-xs">Documents to request</Label>
            <div className="space-y-1.5">
              {docs.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={d.name} onChange={e => updateDoc(i, 'name', e.target.value)} placeholder="e.g. Updated payslip (last 4 weeks)" className="flex-1 h-9 text-sm" />
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeDoc(i)} disabled={docs.length === 1}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addDoc}>
              <Plus className="w-3 h-3" /> Add another document
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          <Button onClick={handleSend} disabled={!canSend || sending} className="gap-1.5 bg-foreground text-background hover:bg-foreground/90">
            <Send className="w-3.5 h-3.5" /> {sending ? 'Sending…' : `Send MIR (${cleanedDocs.length}${selectedApplicants.length > 1 ? ` × ${selectedApplicants.length}` : ''})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}