import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNow, format, isBefore, isToday } from 'date-fns';
import { StickyNote, BellRing, Plus, Check, Trash2, CalendarClock } from 'lucide-react';

interface Note {
  id: string;
  content: string;
  created_at: string;
  author_id: string | null;
  author_name?: string | null;
}

interface Reminder {
  id: string;
  title: string;
  due_date: string;
  completed: boolean;
  created_by: string | null;
}

interface Props {
  companyId: string;
  companyName: string;
  isPreviewMode?: boolean;
}

export function CompanyEngagementPanel({ companyId, companyName, isPreviewMode }: Props) {
  const { user, effectiveBrokerId } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (isPreviewMode) { setLoading(false); return; }
    setLoading(true);
    const [{ data: n }, { data: r }] = await Promise.all([
      supabase.from('company_notes').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('company_reminders').select('*').eq('company_id', companyId).order('due_date', { ascending: true }),
    ]);
    const authorIds = Array.from(new Set((n ?? []).map(x => x.author_id).filter(Boolean) as string[]));
    let nameMap: Record<string, string> = {};
    if (authorIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', authorIds);
      (profs ?? []).forEach(p => { nameMap[p.user_id!] = p.full_name || p.email || 'Unknown'; });
    }
    setNotes((n ?? []).map(x => ({ ...x, author_name: x.author_id ? nameMap[x.author_id] ?? 'Unknown' : 'System' })));
    setReminders(r ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId]);

  const addNote = async () => {
    if (!noteDraft.trim() || !effectiveBrokerId) return;
    if (isPreviewMode) { toast.info('Preview mode — note not saved'); setNoteDraft(''); return; }
    const { error } = await supabase.from('company_notes').insert({
      company_id: companyId,
      broker_id: effectiveBrokerId,
      author_id: user?.id ?? null,
      content: noteDraft.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setNoteDraft('');
    toast.success('Note added');
    load();
  };

  const deleteNote = async (id: string) => {
    if (isPreviewMode) return;
    const { error } = await supabase.from('company_notes').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const addReminder = async () => {
    if (!reminderTitle.trim() || !reminderDate || !effectiveBrokerId) return;
    if (isPreviewMode) { toast.info('Preview mode — reminder not saved'); return; }
    const { error } = await supabase.from('company_reminders').insert({
      company_id: companyId,
      broker_id: effectiveBrokerId,
      created_by: user?.id ?? null,
      title: reminderTitle.trim(),
      due_date: reminderDate,
    });
    if (error) { toast.error(error.message); return; }
    setReminderTitle('');
    setReminderDate('');
    toast.success('Reminder set');
    load();
  };

  const toggleReminder = async (r: Reminder) => {
    if (isPreviewMode) return;
    const { error } = await supabase
      .from('company_reminders')
      .update({ completed: !r.completed, completed_at: !r.completed ? new Date().toISOString() : null })
      .eq('id', r.id);
    if (error) { toast.error(error.message); return; }
    setReminders(prev => prev.map(x => x.id === r.id ? { ...x, completed: !x.completed } : x));
  };

  const deleteReminder = async (id: string) => {
    if (isPreviewMode) return;
    const { error } = await supabase.from('company_reminders').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Reminders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BellRing className="w-4 h-4 text-primary" /> Next-touch reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2">
            <Input
              placeholder={`Reminder for ${companyName}...`}
              value={reminderTitle}
              onChange={(e) => setReminderTitle(e.target.value)}
            />
            <Input
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              className="w-[160px]"
            />
            <Button size="sm" onClick={addReminder} disabled={!reminderTitle.trim() || !reminderDate}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No reminders yet. Set a next-touch above.</p>
          ) : (
            <ul className="space-y-2">
              {reminders.map((r) => {
                const due = new Date(r.due_date + 'T00:00:00');
                const overdue = !r.completed && isBefore(due, today);
                const isDueToday = !r.completed && isToday(due);
                return (
                  <li
                    key={r.id}
                    className={`flex items-center gap-3 rounded-md border px-3 py-2 ${r.completed ? 'opacity-60' : ''} ${overdue ? 'border-red-500/40 bg-red-500/5' : isDueToday ? 'border-amber-500/40 bg-amber-500/5' : ''}`}
                  >
                    <Checkbox checked={r.completed} onCheckedChange={() => toggleReminder(r)} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${r.completed ? 'line-through' : 'font-medium'}`}>{r.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <CalendarClock className="w-3 h-3" />
                        {format(due, 'd MMM yyyy')}
                        {overdue && <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-600">Overdue</Badge>}
                        {isDueToday && <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">Today</Badge>}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteReminder(r.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-primary" /> Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder={`Log a note about ${companyName}...`}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={addNote} disabled={!noteDraft.trim()}>
                <Check className="w-4 h-4 mr-1" /> Add note
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No notes yet.</p>
          ) : (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="rounded-md border bg-muted/30 px-3 py-2">
                  <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{n.author_name} · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                    <Button size="icon" variant="ghost" onClick={() => deleteNote(n.id)} className="h-6 w-6 hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}