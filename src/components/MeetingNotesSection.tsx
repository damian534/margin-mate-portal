import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SectionCard } from '@/components/lead/SectionCard';
import { Brain, Plus, Sparkles, Trash2, Pencil, Save, X, Copy, Loader2, Maximize2, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { logAudit } from '@/lib/leadAudit';
import { isValidEmail } from '@/lib/email';
import { MeetingEmailEditor } from '@/components/meeting/MeetingEmailEditor';
import { createMeetingEmail, meetingMarkdownToHtml, emailHtmlToMarkdown, formatMeetingEmailForSending } from '@/lib/meetingEmail';

interface MeetingNote {
  id: string;
  title: string;
  meeting_date: string;
  transcript: string | null;
  summary_markdown: string | null;
  summary_status: string;
  client_email_sent_at: string | null;
  client_email_markdown: string | null;
  created_at: string;
}

interface Props {
  leadId: string;
  brokerId: string | null;
  isPreviewMode?: boolean;
}

export function MeetingNotesSection({ leadId, brokerId, isPreviewMode }: Props) {
  const [meetings, setMeetings] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingSummary, setEditingSummary] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);

  // client info for the post-meeting email
  const [clientEmail, setClientEmail] = useState('');
  const [clientFirstName, setClientFirstName] = useState('');

  // email-client dialog state
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  // new-form state
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [newTranscript, setNewTranscript] = useState('');
  const [generatingNew, setGeneratingNew] = useState(false);
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => { fetchMeetings(); fetchClientInfo(); }, [leadId]);

  async function fetchMeetings() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('meeting_notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('meeting_date', { ascending: false })
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) { console.error(error); return; }
    setMeetings((data || []) as MeetingNote[]);
  }

  async function fetchClientInfo() {
    if (!leadId || leadId.startsWith('preview-')) return;
    const { data } = await (supabase as any)
      .from('leads')
      .select('email, first_name, last_name')
      .eq('id', leadId)
      .maybeSingle();
    if (data) {
      setClientEmail((data.email as string) || '');
      setClientFirstName((data.first_name as string) || '');
    }
  }

  async function generateAndSave() {
    if (isPreviewMode) { toast.info('Preview mode — AI disabled'); return; }
    if (!brokerId) { toast.error('No broker assigned to this deal'); return; }
    if (!newTranscript.trim() || newTranscript.trim().length < 20) {
      toast.error('Paste a transcript (at least a few sentences) first');
      return;
    }
    setGeneratingNew(true);
    try {
      const title = newTitle.trim() || 'Meeting';
      const { data, error } = await supabase.functions.invoke('summarize-meeting', {
        body: { transcript: newTranscript, title, meeting_date: newDate },
      });
      if (error) throw error;
      const summary = (data as any)?.summary;
      const errMsg = (data as any)?.error;
      if (errMsg) { toast.error(errMsg); return; }
      if (!summary) { toast.error('No summary returned'); return; }

      const { data: userRes } = await supabase.auth.getUser();
      const { data: inserted, error: insErr } = await (supabase as any)
        .from('meeting_notes')
        .insert({
          lead_id: leadId,
          broker_id: brokerId,
          title,
          meeting_date: newDate,
          transcript: null,
          summary_markdown: summary,
          summary_status: 'generated',
          created_by: userRes.user?.id ?? null,
        })
        .select('*')
        .single();
      if (insErr) { toast.error(insErr.message); return; }
      setMeetings(prev => [inserted as MeetingNote, ...prev]);
      setOpenId((inserted as MeetingNote).id);
      setNewTitle(''); setNewTranscript(''); setNewDate(format(new Date(), 'yyyy-MM-dd'));
      setAdding(false);
      toast.success('Summary generated');
    } catch (e: any) {
      toast.error(e?.message || 'AI request failed');
    } finally {
      setGeneratingNew(false);
    }
  }

  async function saveNoteOnly() {
    if (!brokerId) { toast.error('No broker assigned to this deal'); return; }
    if (!newTranscript.trim()) { toast.error('Type or paste a note first'); return; }
    setSavingNew(true);
    try {
      const title = newTitle.trim() || 'Meeting note';
      const { data: userRes } = await supabase.auth.getUser();
      const { data: inserted, error: insErr } = await (supabase as any)
        .from('meeting_notes')
        .insert({
          lead_id: leadId,
          broker_id: brokerId,
          title,
          meeting_date: newDate,
          transcript: null,
          summary_markdown: newTranscript,
          summary_status: 'manual',
          created_by: userRes.user?.id ?? null,
        })
        .select('*')
        .single();
      if (insErr) { toast.error(insErr.message); return; }
      setMeetings(prev => [inserted as MeetingNote, ...prev]);
      setNewTitle(''); setNewTranscript(''); setNewDate(format(new Date(), 'yyyy-MM-dd'));
      setAdding(false);
      toast.success('Note saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save note');
    } finally {
      setSavingNew(false);
    }
  }

  async function saveSummary(m: MeetingNote) {
    const v = editingSummary[m.id];
    if (v === undefined) return;
    const { error } = await (supabase as any)
      .from('meeting_notes')
      .update({ summary_markdown: v, summary_status: 'edited' })
      .eq('id', m.id);
    if (error) { toast.error(error.message); return; }
    setMeetings(prev => prev.map(x => x.id === m.id ? { ...x, summary_markdown: v, summary_status: 'edited' } : x));
    setEditingSummary(prev => { const n = { ...prev }; delete n[m.id]; return n; });
    toast.success('Summary saved');
  }

  async function deleteMeeting(m: MeetingNote) {
    if (!confirm(`Delete meeting "${m.title}"? This cannot be undone.`)) return;
    const { error } = await (supabase as any).from('meeting_notes').delete().eq('id', m.id);
    if (error) { toast.error(error.message); return; }
    setMeetings(prev => prev.filter(x => x.id !== m.id));
    toast.success('Deleted');
  }

  function copySummary(m: MeetingNote) {
    if (!m.summary_markdown) return;
    navigator.clipboard.writeText(m.summary_markdown);
    toast.success('Summary copied');
  }

  function openEmailDialog(m: MeetingNote) {
    setEmailTo(clientEmail);
    setEmailSubject(`Meeting summary — ${m.title} (${format(new Date(m.meeting_date + 'T00:00:00'), 'd MMM yyyy')})`);
    setEmailBody(m.client_email_markdown
      ? meetingMarkdownToHtml(m.client_email_markdown)
      : createMeetingEmail(m.summary_markdown || '', clientFirstName, format(new Date(m.meeting_date + 'T00:00:00'), 'd MMM yyyy'))); 
    setEmailOpen(true);
  }

  async function sendClientEmail(m: MeetingNote) {
    if (isPreviewMode) { toast.info('Preview mode — email disabled'); return; }
    if (!isValidEmail(emailTo)) { toast.error('Enter a valid client email address'); return; }
    if (!emailSubject.trim()) { toast.error('Enter a subject'); return; }
    if (!emailHtmlToMarkdown(emailBody).trim()) { toast.error('The email body is empty'); return; }
    setEmailSending(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const replyTo = userRes.user?.email || undefined;
      const html = formatMeetingEmailForSending(emailBody);
      const storedDraft = emailHtmlToMarkdown(emailBody);
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { to: emailTo.trim(), subject: emailSubject.trim(), html, reply_to: replyTo },
      });
      if (error) throw error;
      const errMsg = (data as any)?.error;
      if (errMsg) { toast.error(typeof errMsg === 'string' ? errMsg : 'Email failed to send'); return; }

      const sentAt = new Date().toISOString();
      const { error: updErr } = await (supabase as any)
        .from('meeting_notes')
        .update({ client_email_sent_at: sentAt, client_email_markdown: storedDraft })
        .eq('id', m.id);
      if (updErr) console.warn('Failed to record email send', updErr);
      setMeetings(prev => prev.map(x => x.id === m.id ? { ...x, client_email_sent_at: sentAt, client_email_markdown: storedDraft } : x));
      logAudit(leadId, `📧 Post-meeting summary emailed to ${emailTo.trim()} — "${m.title}"`, { isPreview: isPreviewMode });
      setEmailOpen(false);
      toast.success(`Summary emailed to ${emailTo.trim()}`);
    } catch (e: any) {
      toast.error(e?.message || 'Email failed to send');
    } finally {
      setEmailSending(false);
    }
  }

  async function handleDroppedFile(file: File) {
    const name = file.name.toLowerCase();
    const isTextLike =
      file.type.startsWith('text/') ||
      /\.(txt|md|vtt|srt|json|csv|log)$/i.test(name);
    if (!isTextLike) {
      toast.error('Only text-based transcripts (.txt, .md, .vtt, .srt) can be imported here');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Transcript file too large (max 5MB)');
      return;
    }
    const text = await file.text();
    if (!text.trim()) {
      toast.error('File is empty');
      return;
    }
    setAdding(true);
    if (!newTitle.trim()) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    setNewTranscript(prev => (prev ? prev + '\n\n' : '') + text);
    toast.success(`Imported "${file.name}" — review and generate a summary`);
  }

  const openMeeting = meetings.find(x => x.id === openId) || null;

  return (
    <SectionCard
      icon={Brain}
      title="Meeting Notes"
      tone="neutral"
      subtitle={meetings.length > 0
        ? `${meetings.length} ${meetings.length === 1 ? 'meeting' : 'meetings'}`
        : 'Paste a call transcript and let AI summarise it'}
    >
      <div
        className={`space-y-4 rounded-md transition-colors ${dragOver ? 'ring-2 ring-primary bg-primary/5 p-2 -m-2' : ''}`}
        onDragOver={(e) => {
          if (e.dataTransfer?.types?.includes('Files')) {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(true);
          }
        }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
        onDrop={(e) => {
          if (!e.dataTransfer?.files?.length) return;
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          Array.from(e.dataTransfer.files).forEach(handleDroppedFile);
        }}
      >
        {dragOver && (
          <p className="text-xs text-primary text-center font-medium">Drop transcript file to import…</p>
        )}
        {/* Add meeting */}
        {adding ? (
          <div className="border rounded-md p-3 space-y-3 bg-muted/30">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr,180px] gap-2">
              <div>
                <Label className="text-xs">Title</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Strategy call — Anthony & Bianca"
                  className="h-9"
                  disabled={generatingNew}
                />
              </div>
              <div>
                <Label className="text-xs">Meeting date</Label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-9" disabled={generatingNew} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Transcript or note</Label>
              <Textarea
                value={newTranscript}
                onChange={(e) => setNewTranscript(e.target.value)}
                placeholder="Paste a transcript to AI-summarise, or just type a note and save it directly..."
                rows={8}
                className="text-sm font-mono"
                disabled={generatingNew || savingNew}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" disabled={generatingNew || savingNew} onClick={() => { setAdding(false); setNewTitle(''); setNewTranscript(''); }}>
                Cancel
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={saveNoteOnly} disabled={!newTranscript.trim() || generatingNew || savingNew}>
                {savingNew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {savingNew ? 'Saving…' : 'Save Note'}
              </Button>
              <Button size="sm" className="gap-1.5" onClick={generateAndSave} disabled={!newTranscript.trim() || generatingNew || savingNew}>
                {generatingNew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {generatingNew ? 'Generating…' : 'Generate Summary'}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
            <Plus className="w-3.5 h-3.5" /> Add meeting
          </Button>
        )}

        {/* Meetings list */}
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && meetings.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground text-center py-4">No meetings yet</p>
        )}

        <div className="space-y-3">
          {meetings.map((m) => {
            const hasSummary = !!m.summary_markdown;
            return (
              <div
                key={m.id}
                className={
                  hasSummary
                    ? "border rounded-md border-green-500/40 bg-green-500/10"
                    : "border rounded-md"
                }
              >
                <div className="flex items-center justify-between gap-2 p-3">
                  <button
                    onClick={() => setOpenId(m.id)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                  >
                    <Maximize2 className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{m.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(m.meeting_date + 'T00:00:00'), 'd MMM yyyy')}
                        {m.summary_markdown ? ' · Summary ready' : ' · No summary'}
                        {m.client_email_sent_at && ` · Emailed to client ${format(new Date(m.client_email_sent_at), 'd MMM')}`}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteMeeting(m)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Meeting detail dialog */}
      <Dialog open={!!openId} onOpenChange={(o) => { if (!o) setOpenId(null); }}>
        <DialogContent className="max-w-3xl w-[95vw] h-[85vh] p-0 overflow-hidden flex flex-col">
          {openMeeting && (() => {
            const m = openMeeting;
            const sEditing = editingSummary[m.id] !== undefined;
            return (
              <>
                <DialogHeader className="px-5 py-3 border-b shrink-0">
                  <DialogTitle className="text-base">{m.title}</DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(m.meeting_date + 'T00:00:00'), 'd MMM yyyy')}
                    {m.summary_markdown ? ' · Summary ready' : ' · No summary'}
                    {m.client_email_sent_at && ` · Emailed to client ${format(new Date(m.client_email_sent_at), 'd MMM yyyy')}`}
                  </p>
                </DialogHeader>
                <div className="flex items-center justify-between px-5 py-2 border-b bg-muted/30 shrink-0">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">AI Summary</Label>
                  <div className="flex items-center gap-1">
                    {m.summary_markdown && !sEditing && (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => copySummary(m)}>
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setEditingSummary(prev => ({ ...prev, [m.id]: m.summary_markdown || '' }))}>
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => openEmailDialog(m)}>
                          <Mail className="w-3.5 h-3.5" /> Email client
                        </Button>
                      </>
                    )}
                    {sEditing && (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setEditingSummary(prev => { const n = { ...prev }; delete n[m.id]; return n; })}>
                          <X className="w-3.5 h-3.5" /> Cancel
                        </Button>
                        <Button size="sm" className="h-7 gap-1" onClick={() => saveSummary(m)}>
                          <Save className="w-3.5 h-3.5" /> Save
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  {sEditing ? (
                    <Textarea
                      value={editingSummary[m.id]}
                      onChange={(e) => setEditingSummary(prev => ({ ...prev, [m.id]: e.target.value }))}
                      className="text-sm font-mono min-h-[60vh]"
                    />
                  ) : m.summary_markdown ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-table:my-2 prose-th:bg-muted prose-th:text-left prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:border prose-th:border prose-thead:border-b">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.summary_markdown}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No summary.</p>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Email client dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Email post-meeting summary</DialogTitle>
          </DialogHeader>
          {openMeeting && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">To</Label>
                <Input
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="client@example.com"
                  className="h-9"
                  disabled={emailSending}
                />
                {!clientEmail && (
                  <p className="text-[11px] text-muted-foreground mt-1">No email saved on this deal — type the client's address above.</p>
                )}
              </div>
              <div>
                <Label className="text-xs">Subject</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="h-9"
                  disabled={emailSending}
                />
              </div>
              <div>
                <Label className="text-xs">Message</Label>
                <MeetingEmailEditor
                  value={emailBody}
                  onChange={setEmailBody}
                  disabled={emailSending}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Replies go to your own email address. The send is recorded on the deal's history.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" disabled={emailSending} onClick={() => setEmailOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => sendClientEmail(openMeeting)} disabled={emailSending}>
                  {emailSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  {emailSending ? 'Sending…' : 'Send to client'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
