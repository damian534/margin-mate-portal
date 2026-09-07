import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  CheckCircle2, Clock, Download, FileSignature, Loader2, Plus, Send, Trash2, X, History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Signer {
  id: string;
  name: string;
  email: string;
  signing_order: number;
  status: string;
  signed_at: string | null;
}

interface EsignDoc {
  id: string;
  title: string;
  message: string | null;
  file_path: string;
  file_name: string;
  signed_file_path: string | null;
  status: string;
  created_at: string;
  sent_at: string | null;
  completed_at: string | null;
  esign_signers: Signer[];
}

interface EsignEvent {
  id: string;
  event_type: string;
  detail: string | null;
  ip_address: string | null;
  created_at: string;
}

interface Props {
  leadId?: string | null;
  contactId?: string | null;
  /** Pre-fills the first signer row. */
  defaultSigner?: { name?: string | null; email?: string | null };
  isPreviewMode?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  voided: 'bg-red-100 text-red-700',
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const newToken = () =>
  (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');

export function EsignSection({ leadId, contactId, defaultSigner, isPreviewMode }: Props) {
  const { effectiveBrokerId, user } = useAuth();
  const [docs, setDocs] = useState<EsignDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [events, setEvents] = useState<{ title: string; rows: EsignEvent[] } | null>(null);

  // New document form
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<{ name: string; email: string }[]>([
    { name: defaultSigner?.name || '', email: defaultSigner?.email || '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'details' | 'fields'>('details');
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);

  const load = useCallback(async () => {
    if (isPreviewMode) { setDocs([]); setLoading(false); return; }
    if (!leadId && !contactId) { setDocs([]); setLoading(false); return; }
    setLoading(true);
    let query = supabase
      .from('esign_documents')
      .select('id, title, message, file_path, file_name, signed_file_path, status, created_at, sent_at, completed_at, esign_signers(id, name, email, signing_order, status, signed_at)')
      .order('created_at', { ascending: false });
    query = leadId ? query.eq('lead_id', leadId) : query.eq('contact_id', contactId!);
    const { data, error } = await query;
    if (error) toast.error('Could not load signing documents');
    setDocs(((data as unknown as EsignDoc[]) || []).map(d => ({
      ...d,
      esign_signers: [...(d.esign_signers || [])].sort((a, b) => a.signing_order - b.signing_order),
    })));
    setLoading(false);
  }, [leadId, contactId, isPreviewMode]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setTitle(''); setMessage(''); setFile(null);
    setRows([{ name: defaultSigner?.name || '', email: defaultSigner?.email || '' }]);
  };

  const createAndSend = async () => {
    if (!title.trim()) { toast.error('Give the document a title'); return; }
    if (!file) { toast.error('Upload the document to be signed'); return; }
    const cleaned = rows.map(r => ({ name: r.name.trim(), email: r.email.trim() })).filter(r => r.name || r.email);
    if (!cleaned.length) { toast.error('Add at least one signer'); return; }
    for (const r of cleaned) {
      if (!r.name) { toast.error('Every signer needs a name'); return; }
      if (!isEmail(r.email)) { toast.error(`"${r.email || 'blank'}" is not a valid email`); return; }
    }
    const brokerId = effectiveBrokerId;
    if (!brokerId || !user) { toast.error('You need to be signed in'); return; }

    setSaving(true);
    try {
      const docId = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${brokerId}/${docId}/${Date.now()}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from('esign-documents')
        .upload(filePath, file, { contentType: file.type || 'application/octet-stream', upsert: false });
      if (upErr) throw upErr;

      const { error: docErr } = await supabase.from('esign_documents').insert({
        id: docId,
        broker_id: brokerId,
        created_by: user.id,
        lead_id: leadId || null,
        contact_id: contactId || null,
        title: title.trim(),
        message: message.trim() || null,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        content_type: file.type || null,
        status: 'draft',
      });
      if (docErr) throw docErr;

      const { error: signerErr } = await supabase.from('esign_signers').insert(
        cleaned.map((r, i) => ({
          document_id: docId,
          name: r.name,
          email: r.email,
          signing_order: i + 1,
          token: newToken(),
        }))
      );
      if (signerErr) throw signerErr;

      const { error: sendErr } = await supabase.functions.invoke('esign-send', {
        body: { document_id: docId, app_url: window.location.origin },
      });
      if (sendErr) throw sendErr;

      toast.success('Sent for signing');
      setOpen(false);
      resetForm();
      load();
    } catch (e) {
      toast.error((e as Error).message || 'Could not send the document');
    } finally {
      setSaving(false);
    }
  };

  const resend = async (doc: EsignDoc) => {
    setBusy(doc.id);
    const { error } = await supabase.functions.invoke('esign-send', {
      body: { document_id: doc.id, app_url: window.location.origin },
    });
    setBusy(null);
    if (error) { toast.error('Could not resend'); return; }
    toast.success('Reminder sent');
    load();
  };

  const void_ = async (doc: EsignDoc) => {
    setBusy(doc.id);
    const { error } = await supabase
      .from('esign_documents')
      .update({ status: 'voided', voided_at: new Date().toISOString() })
      .eq('id', doc.id);
    setBusy(null);
    if (error) { toast.error('Could not withdraw'); return; }
    toast.success('Document withdrawn');
    load();
  };

  const remove = async (doc: EsignDoc) => {
    setBusy(doc.id);
    const { error } = await supabase.from('esign_documents').delete().eq('id', doc.id);
    setBusy(null);
    if (error) { toast.error('Could not delete'); return; }
    load();
  };

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from('esign-documents').createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { toast.error('Could not open the file'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const showAudit = async (doc: EsignDoc) => {
    const { data } = await supabase
      .from('esign_events')
      .select('id, event_type, detail, ip_address, created_at')
      .eq('document_id', doc.id)
      .order('created_at', { ascending: true });
    setEvents({ title: doc.title, rows: (data as EsignEvent[]) || [] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSignature className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">E-signature</h3>
        </div>
        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5" disabled={isPreviewMode}>
              <Plus className="w-3.5 h-3.5" /> Send for signing
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Send a document for signing</DialogTitle>
              <DialogDescription>Upload the document, add who needs to sign, and we'll email each of them a private signing link.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="esign-title">Document title</Label>
                <Input id="esign-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Terms of Engagement" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="esign-file">Document (PDF recommended)</Label>
                <Input
                  id="esign-file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="esign-message">Message to signers (optional)</Label>
                <Textarea id="esign-message" rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="A short note that appears in the email and on the signing page." />
              </div>

              <div className="space-y-2">
                <Label>Signers (they sign in this order)</Label>
                {rows.map((r, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <Input placeholder="Full name" value={r.name}
                      onChange={e => setRows(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                    <Input placeholder="Email" type="email" value={r.email}
                      onChange={e => setRows(p => p.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} />
                    {rows.length > 1 && (
                      <Button variant="ghost" size="icon" className="shrink-0"
                        onClick={() => setRows(p => p.filter((_, j) => j !== i))}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="gap-1.5"
                  onClick={() => setRows(p => [...p, { name: '', email: '' }])}>
                  <Plus className="w-3.5 h-3.5" /> Add signer
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={createAndSend} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {saving ? 'Sending…' : 'Send for signing'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Nothing sent for signing yet. Upload a terms sheet or agreement to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <Card key={doc.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {doc.file_name} · created {format(new Date(doc.created_at), 'd MMM yy')}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn('shrink-0 text-[10px] capitalize', STATUS_STYLES[doc.status])}>
                    {doc.status === 'completed' ? 'Signed' : doc.status}
                  </Badge>
                </div>

                <div className="space-y-1">
                  {doc.esign_signers.map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">{s.signing_order}. {s.name} <span className="text-muted-foreground">({s.email})</span></span>
                      <span className={cn('shrink-0 flex items-center gap-1',
                        s.status === 'signed' ? 'text-green-600' : 'text-muted-foreground')}>
                        {s.status === 'signed'
                          ? <><CheckCircle2 className="w-3 h-3" /> Signed {s.signed_at ? format(new Date(s.signed_at), 'd MMM') : ''}</>
                          : <><Clock className="w-3 h-3" /> {s.status}</>}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => download(doc.file_path)}>
                    <Download className="w-3 h-3" /> Original
                  </Button>
                  {doc.signed_file_path && (
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => download(doc.signed_file_path!)}>
                      <Download className="w-3 h-3" /> Signed copy
                    </Button>
                  )}
                  {doc.status !== 'completed' && doc.status !== 'voided' && (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={busy === doc.id} onClick={() => resend(doc)}>
                      <Send className="w-3 h-3" /> Resend
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => showAudit(doc)}>
                    <History className="w-3 h-3" /> Audit trail
                  </Button>
                  {doc.status !== 'completed' && doc.status !== 'voided' && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" disabled={busy === doc.id} onClick={() => void_(doc)}>
                      <X className="w-3 h-3" /> Withdraw
                    </Button>
                  )}
                  {doc.status === 'draft' && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" disabled={busy === doc.id} onClick={() => remove(doc)}>
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!events} onOpenChange={o => !o && setEvents(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit trail</DialogTitle>
            <DialogDescription>{events?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(events?.rows || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : events!.rows.map(e => (
              <div key={e.id} className="rounded-lg border px-3 py-2">
                <p className="text-sm capitalize">{e.event_type}</p>
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(e.created_at), 'd MMM yy, h:mma')}
                  {e.detail ? ` · ${e.detail}` : ''}
                  {e.ip_address ? ` · IP ${e.ip_address}` : ''}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
