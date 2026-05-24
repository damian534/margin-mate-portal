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
import { Brain, Plus, Sparkles, Trash2, Pencil, Save, X, Copy, Loader2, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface MeetingNote {
  id: string;
  title: string;
  meeting_date: string;
  transcript: string | null;
  summary_markdown: string | null;
  summary_status: string;
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

  // new-form state
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [newTranscript, setNewTranscript] = useState('');
  const [generatingNew, setGeneratingNew] = useState(false);

  useEffect(() => { fetchMeetings(); }, [leadId]);

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

  return (
    <SectionCard
      icon={Brain}
      title="Meeting Notes"
      tone="neutral"
      subtitle={meetings.length > 0
        ? `${meetings.length} ${meetings.length === 1 ? 'meeting' : 'meetings'}`
        : 'Paste a call transcript and let AI summarise it'}
    >
      <div className="space-y-4">
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
              <Label className="text-xs">Transcript (not saved — used only to generate the summary)</Label>
              <Textarea
                value={newTranscript}
                onChange={(e) => setNewTranscript(e.target.value)}
                placeholder="Paste the raw call transcript here..."
                rows={8}
                className="text-sm font-mono"
                disabled={generatingNew}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" disabled={generatingNew} onClick={() => { setAdding(false); setNewTitle(''); setNewTranscript(''); }}>
                Cancel
              </Button>
              <Button size="sm" className="gap-1.5" onClick={generateAndSave} disabled={!newTranscript.trim() || generatingNew}>
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
          {(() => {
            const m = meetings.find(x => x.id === openId);
            if (!m) return null;
            const sEditing = editingSummary[m.id] !== undefined;
            return (
              <>
                <DialogHeader className="px-5 py-3 border-b shrink-0">
                  <DialogTitle className="text-base">{m.title}</DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(m.meeting_date + 'T00:00:00'), 'd MMM yyyy')}
                    {m.summary_markdown ? ' · Summary ready' : ' · No summary'}
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
    </SectionCard>
  );
}