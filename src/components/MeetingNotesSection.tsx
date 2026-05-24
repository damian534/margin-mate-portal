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
import { Brain, Plus, Sparkles, Trash2, ChevronDown, ChevronUp, Pencil, Save, X, Copy } from 'lucide-react';
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingTranscript, setEditingTranscript] = useState<Record<string, string>>({});
  const [editingSummary, setEditingSummary] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});

  // new-form state
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [newTranscript, setNewTranscript] = useState('');

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

  async function createMeeting(generateAfter: boolean) {
    if (isPreviewMode) { toast.info('Preview mode — not saved'); return; }
    if (!brokerId) { toast.error('No broker assigned to this deal'); return; }
    if (!newTranscript.trim() && !newTitle.trim()) {
      toast.error('Add a title or transcript first');
      return;
    }
    const { data: userRes } = await supabase.auth.getUser();
    const insertData: any = {
      lead_id: leadId,
      broker_id: brokerId,
      title: newTitle.trim() || 'Meeting',
      meeting_date: newDate,
      transcript: newTranscript.trim() || null,
      created_by: userRes.user?.id ?? null,
    };
    const { data, error } = await (supabase as any)
      .from('meeting_notes')
      .insert(insertData)
      .select('*')
      .single();
    if (error) { toast.error(error.message); return; }
    const created = data as MeetingNote;
    setMeetings(prev => [created, ...prev]);
    setExpanded(prev => ({ ...prev, [created.id]: true }));
    setNewTitle(''); setNewTranscript(''); setNewDate(format(new Date(), 'yyyy-MM-dd'));
    setAdding(false);
    toast.success('Meeting added');
    if (generateAfter && created.transcript) {
      generateSummary(created);
    }
  }

  async function generateSummary(m: MeetingNote) {
    if (isPreviewMode) { toast.info('Preview mode — AI disabled'); return; }
    if (!m.transcript || m.transcript.trim().length < 20) {
      toast.error('Add a transcript (at least a few sentences) before generating');
      return;
    }
    setGenerating(prev => ({ ...prev, [m.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('summarize-meeting', {
        body: { transcript: m.transcript, title: m.title, meeting_date: m.meeting_date },
      });
      if (error) throw error;
      const summary = (data as any)?.summary;
      const errMsg = (data as any)?.error;
      if (errMsg) { toast.error(errMsg); return; }
      if (!summary) { toast.error('No summary returned'); return; }
      const { error: updErr } = await (supabase as any)
        .from('meeting_notes')
        .update({ summary_markdown: summary, summary_status: 'generated' })
        .eq('id', m.id);
      if (updErr) { toast.error(updErr.message); return; }
      setMeetings(prev => prev.map(x => x.id === m.id ? { ...x, summary_markdown: summary, summary_status: 'generated' } : x));
      setExpanded(prev => ({ ...prev, [m.id]: true }));
      toast.success('Summary generated');
    } catch (e: any) {
      toast.error(e?.message || 'AI request failed');
    } finally {
      setGenerating(prev => ({ ...prev, [m.id]: false }));
    }
  }

  async function saveTranscript(m: MeetingNote) {
    const v = editingTranscript[m.id];
    if (v === undefined) return;
    const { error } = await (supabase as any)
      .from('meeting_notes')
      .update({ transcript: v })
      .eq('id', m.id);
    if (error) { toast.error(error.message); return; }
    setMeetings(prev => prev.map(x => x.id === m.id ? { ...x, transcript: v } : x));
    setEditingTranscript(prev => { const n = { ...prev }; delete n[m.id]; return n; });
    toast.success('Transcript saved');
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
                />
              </div>
              <div>
                <Label className="text-xs">Meeting date</Label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Transcript</Label>
              <Textarea
                value={newTranscript}
                onChange={(e) => setNewTranscript(e.target.value)}
                placeholder="Paste the raw call transcript here..."
                rows={8}
                className="text-sm font-mono"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setNewTitle(''); setNewTranscript(''); }}>
                Cancel
              </Button>
              <Button variant="outline" size="sm" onClick={() => createMeeting(false)}>
                Save
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => createMeeting(true)} disabled={!newTranscript.trim()}>
                <Sparkles className="w-3.5 h-3.5" /> Save & Summarise
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
            const isOpen = !!expanded[m.id];
            const tEditing = editingTranscript[m.id] !== undefined;
            const sEditing = editingSummary[m.id] !== undefined;
            return (
              <div key={m.id} className="border rounded-md">
                <div className="flex items-center justify-between gap-2 p-3">
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [m.id]: !isOpen }))}
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                  >
                    {isOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{m.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(m.meeting_date + 'T00:00:00'), 'd MMM yyyy')}
                        {m.summary_markdown ? ' · Summary ready' : (m.transcript ? ' · Transcript only' : ' · Empty')}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant={m.summary_markdown ? 'outline' : 'default'}
                      className="h-7 gap-1.5"
                      disabled={!!generating[m.id] || !m.transcript}
                      onClick={() => generateSummary(m)}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {generating[m.id] ? 'Generating…' : (m.summary_markdown ? 'Regenerate' : 'Summarise')}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteMeeting(m)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t p-3 space-y-4">
                    {/* Summary */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
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
                      {sEditing ? (
                        <Textarea
                          value={editingSummary[m.id]}
                          onChange={(e) => setEditingSummary(prev => ({ ...prev, [m.id]: e.target.value }))}
                          rows={20}
                          className="text-sm font-mono"
                        />
                      ) : m.summary_markdown ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-table:my-2 prose-th:bg-muted prose-th:text-left prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:border prose-th:border prose-thead:border-b border rounded-md p-4 bg-background">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.summary_markdown}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No summary yet. Paste a transcript and click Summarise.</p>
                      )}
                    </div>

                    {/* Transcript */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Transcript</Label>
                        <div className="flex items-center gap-1">
                          {!tEditing && (
                            <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setEditingTranscript(prev => ({ ...prev, [m.id]: m.transcript || '' }))}>
                              <Pencil className="w-3.5 h-3.5" /> {m.transcript ? 'Edit' : 'Add'}
                            </Button>
                          )}
                          {tEditing && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setEditingTranscript(prev => { const n = { ...prev }; delete n[m.id]; return n; })}>
                                <X className="w-3.5 h-3.5" /> Cancel
                              </Button>
                              <Button size="sm" className="h-7 gap-1" onClick={() => saveTranscript(m)}>
                                <Save className="w-3.5 h-3.5" /> Save
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {tEditing ? (
                        <Textarea
                          value={editingTranscript[m.id]}
                          onChange={(e) => setEditingTranscript(prev => ({ ...prev, [m.id]: e.target.value }))}
                          rows={12}
                          className="text-sm font-mono"
                          placeholder="Paste raw transcript here..."
                        />
                      ) : m.transcript ? (
                        <pre className="whitespace-pre-wrap text-xs bg-muted/40 border rounded-md p-3 max-h-64 overflow-auto">{m.transcript}</pre>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No transcript stored.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}