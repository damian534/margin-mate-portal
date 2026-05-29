import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, Save, CheckCircle, Trash2, Send, User, Calendar } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { AssigneePicker } from '@/components/AssigneePicker';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ChecklistItem { text: string; done: boolean }

interface TaskRow {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  assigned_to: string | null;
  checklist_items: ChecklistItem[];
  lead_name?: string | null;
}

interface NoteRow {
  id: string;
  content: string;
  created_at: string;
}

function toLocal(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
  /** Optional preloaded task (used in preview mode where DB may be sample data) */
  initialTask?: Partial<TaskRow> | null;
  onChanged?: () => void;
  onOpenDeal?: (leadId: string) => void;
}

export function TaskDetailDialog({ open, onOpenChange, taskId, initialTask, onChanged, onOpenDeal }: Props) {
  const { user, isPreviewMode } = useAuth();
  const [task, setTask] = useState<TaskRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueLocal, setDueLocal] = useState('');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [noteText, setNoteText] = useState('');
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open || !taskId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (isPreviewMode) {
        const t: TaskRow = {
          id: taskId,
          lead_id: initialTask?.lead_id ?? '',
          title: initialTask?.title ?? '',
          description: initialTask?.description ?? null,
          due_date: initialTask?.due_date ?? null,
          completed: initialTask?.completed ?? false,
          completed_at: initialTask?.completed_at ?? null,
          assigned_to: initialTask?.assigned_to ?? null,
          checklist_items: Array.isArray(initialTask?.checklist_items) ? (initialTask!.checklist_items as ChecklistItem[]) : [],
          lead_name: initialTask?.lead_name ?? null,
        };
        if (cancelled) return;
        applyTask(t);
        setNotes([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('tasks')
        .select('id, lead_id, title, description, due_date, completed, completed_at, assigned_to, checklist_items')
        .eq('id', taskId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) { toast.error('Could not load task'); setLoading(false); onOpenChange(false); return; }
      const row: TaskRow = {
        ...(data as any),
        checklist_items: Array.isArray((data as any).checklist_items) ? (data as any).checklist_items : [],
        lead_name: initialTask?.lead_name ?? null,
      };
      applyTask(row);
      const { data: noteRows } = await supabase
        .from('notes')
        .select('id, content, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (!cancelled) setNotes((noteRows as NoteRow[]) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, taskId, isPreviewMode]);

  const applyTask = (t: TaskRow) => {
    setTask(t);
    setTitle(t.title);
    setDescription(t.description ?? '');
    setDueLocal(toLocal(t.due_date));
    setAssignee(t.assigned_to);
    setChecklist(t.checklist_items || []);
  };

  const persistChecklist = async (items: ChecklistItem[]) => {
    setChecklist(items);
    if (isPreviewMode || !task) return;
    await (supabase as any).from('tasks').update({ checklist_items: items }).eq('id', task.id);
  };

  const save = async () => {
    if (!task) return;
    setSaving(true);
    const updates = {
      title: title.trim() || task.title,
      description: description.trim() || null,
      due_date: dueLocal ? new Date(dueLocal).toISOString() : null,
      assigned_to: assignee,
    };
    if (!isPreviewMode) {
      const { error } = await supabase.from('tasks').update(updates).eq('id', task.id);
      if (error) { toast.error('Failed to save'); setSaving(false); return; }
    }
    toast.success('Task saved');
    setSaving(false);
    onChanged?.();
    onOpenChange(false);
  };

  const toggleComplete = async () => {
    if (!task) return;
    const completed = !task.completed;
    if (!isPreviewMode) {
      await supabase.from('tasks').update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq('id', task.id);
    }
    setTask({ ...task, completed, completed_at: completed ? new Date().toISOString() : null });
    toast.success(completed ? 'Task completed' : 'Task reopened');
    onChanged?.();
  };

  const removeTask = async () => {
    if (!task) return;
    if (!confirm('Delete this task?')) return;
    if (!isPreviewMode) {
      await supabase.from('notes').delete().eq('task_id', task.id);
      const { error } = await supabase.from('tasks').delete().eq('id', task.id);
      if (error) { toast.error('Failed to delete'); return; }
    }
    toast.success('Task deleted');
    onChanged?.();
    onOpenChange(false);
  };

  const addNote = async () => {
    if (!task || !user || !noteText.trim()) return;
    const content = `📋 [Task: ${title || task.title}] ${noteText.trim()}`;
    if (isPreviewMode) {
      setNotes(prev => [{ id: `preview-${Date.now()}`, content, created_at: new Date().toISOString() }, ...prev]);
    } else {
      const { data, error } = await supabase.from('notes').insert({
        lead_id: task.lead_id, author_id: user.id, content, task_id: task.id,
      }).select('id, content, created_at').single();
      if (error || !data) { toast.error('Failed to add note'); return; }
      setNotes(prev => [data as NoteRow, ...prev]);
    }
    setNoteText('');
    toast.success('Note added');
  };

  const updateItemText = (idx: number, text: string) =>
    persistChecklist(checklist.map((it, i) => i === idx ? { ...it, text } : it));
  const toggleItem = (idx: number) =>
    persistChecklist(checklist.map((it, i) => i === idx ? { ...it, done: !it.done } : it));
  const removeItem = (idx: number) =>
    persistChecklist(checklist.filter((_, i) => i !== idx));
  const addItem = () =>
    persistChecklist([...checklist, { text: '', done: false }]);

  const dueBadge = (() => {
    if (!task?.due_date) return null;
    const d = new Date(task.due_date);
    if (isPast(d) && !isToday(d) && !task.completed) return { label: 'Overdue', cls: 'text-destructive' };
    if (isToday(d)) return { label: 'Today', cls: 'text-amber-600' };
    return null;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-5 pb-3 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-base">Task</DialogTitle>
              {task?.lead_name && (
                <button
                  type="button"
                  className="mt-1 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  onClick={() => task && onOpenDeal?.(task.lead_id)}
                  title="Open deal"
                >
                  <User className="w-3 h-3" /> {task.lead_name}
                </button>
              )}
            </div>
            {dueBadge && (
              <span className={`text-xs font-medium ${dueBadge.cls}`}>{dueBadge.label}</span>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-5 py-4">
          {loading || !task ? (
            <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Checkbox checked={task.completed} onCheckedChange={toggleComplete} />
                <span className="text-xs text-muted-foreground">
                  {task.completed ? 'Completed' : 'Open'}
                </span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} className="text-base font-medium" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Due</Label>
                  <Input type="datetime-local" value={dueLocal} onChange={e => setDueLocal(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Assigned to</Label>
                  <AssigneePicker value={assignee} onChange={setAssignee} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Checklist</Label>
                {checklist.length > 0 && (
                  <div className="space-y-1">
                    {checklist.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 group">
                        <Checkbox checked={item.done} onCheckedChange={() => toggleItem(idx)} />
                        <Input
                          value={item.text}
                          onChange={e => updateItemText(idx, e.target.value)}
                          placeholder="List item…"
                          className={`h-8 text-sm ${item.done ? 'line-through text-muted-foreground' : ''}`}
                        />
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => removeItem(idx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1 px-1" onClick={addItem}>
                  <Plus className="h-3 w-3" /> Add item
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                {notes.length > 0 && (
                  <div className="space-y-2">
                    {notes.map(n => (
                      <div key={n.id} className="bg-muted/50 rounded-md p-2.5 text-sm">
                        <p className="whitespace-pre-wrap leading-relaxed">{n.content.replace(/^📋 \[Task: .*?\] /, '')}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{format(new Date(n.created_at), 'dd MMM, HH:mm')}</p>
                      </div>
                    ))}
                  </div>
                )}
                <Textarea
                  ref={noteRef}
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add a note to this task…"
                  rows={3}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }}
                />
                <div className="flex justify-end">
                  <Button size="sm" disabled={!noteText.trim()} onClick={addNote}>
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Add note
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between gap-2 p-4 border-t bg-muted/30">
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={removeTask} disabled={!task}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleComplete} disabled={!task}>
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              {task?.completed ? 'Reopen' : 'Mark complete'}
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !task || !title.trim()}>
              <Save className="w-3.5 h-3.5 mr-1.5" /> {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}