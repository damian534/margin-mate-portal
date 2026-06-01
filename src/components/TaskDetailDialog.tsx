import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, Save, CheckCircle, Trash2, Send, User, Calendar, Check, Bold, Italic, List, ListOrdered, ListChecks } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { AssigneePicker } from '@/components/AssigneePicker';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';


const TaskCircleCheck = ({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean;
  onCheckedChange: () => void;
  className?: string;
}) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    onClick={(e) => {
      e.stopPropagation();
      onCheckedChange();
    }}
    className={cn(
      'shrink-0 h-5 w-5 rounded-full border flex items-center justify-center transition-colors',
      checked
        ? 'bg-success border-success text-success-foreground'
        : 'border-muted-foreground/40 hover:border-primary bg-background',
      className,
    )}
  >
    {checked && <Check className="h-3 w-3" strokeWidth={3} />}
  </button>
);

interface ChecklistItem { text: string; done: boolean }

interface TaskRow {
  id: string;
  lead_id: string | null;
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

type FetchedTaskRow = Omit<TaskRow, 'checklist_items' | 'lead_name'> & { checklist_items: unknown };

type TasksChecklistUpdater = {
  from: (table: 'tasks') => {
    update: (values: { checklist_items: ChecklistItem[] }) => {
      eq: (column: 'id', value: string) => Promise<unknown>;
    };
  };
};


const FOLLOW_UP_OPTIONS = [
  { label: 'Later Today', hours: 3 },
  { label: 'Tomorrow', days: 1 },
  { label: '2 Days', days: 2 },
  { label: '3 Days', days: 3 },
  { label: '1 Week', days: 7 },
  { label: '2 Weeks', days: 14 },
  { label: '1 Month', days: 30 },
];

function getFollowUpDate(opt: typeof FOLLOW_UP_OPTIONS[0]) {
  const d = new Date();
  if (opt.hours) { d.setHours(d.getHours() + opt.hours); }
  else if (opt.days) { d.setDate(d.getDate() + opt.days); d.setHours(9, 0, 0, 0); }
  return d;
}

function formatDatetimeLocal(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocal(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function applyTextFormat(
  el: HTMLTextAreaElement | null,
  setValue: (value: string) => void,
  formatter: (value: string, start: number, end: number) => { value: string; cursor: number },
) {
  if (!el) return;
  const { value, cursor } = formatter(el.value, el.selectionStart ?? 0, el.selectionEnd ?? 0);
  setValue(value);
  requestAnimationFrame(() => { el.focus(); el.setSelectionRange(cursor, cursor); });
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
      const fetched = data as FetchedTaskRow;
      const row: TaskRow = {
        ...fetched,
        checklist_items: Array.isArray(fetched.checklist_items) ? fetched.checklist_items as ChecklistItem[] : [],
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
  }, [open, taskId, isPreviewMode, initialTask, onOpenChange]);

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
    await (supabase as unknown as TasksChecklistUpdater).from('tasks').update({ checklist_items: items }).eq('id', task.id);
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
        lead_id: task.lead_id as any, author_id: user.id, content, task_id: task.id,
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
    if (isToday(d)) return { label: 'Today', cls: 'text-success' };
    return null;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] grid-rows-[auto_1fr] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Task</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 p-4">
          {loading || !task ? (
            <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
          ) : (
            <div className={cn(
              'rounded-lg border transition-all overflow-hidden',
              dueBadge?.label === 'Overdue' ? 'border-destructive/30 bg-destructive/5' : task.completed ? 'opacity-70 bg-background' : 'bg-background'
            )}>
              <div className="flex items-start gap-2 p-2.5">
                <TaskCircleCheck checked={task.completed} onCheckedChange={toggleComplete} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', task.completed && 'line-through text-muted-foreground')}>{title || task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {task.due_date && (
                      <span className={cn(
                        'text-xs flex items-center gap-1',
                        dueBadge?.label === 'Overdue' ? 'text-destructive' : dueBadge?.label === 'Today' ? 'text-success' : 'text-muted-foreground'
                      )}>
                        <Calendar className="w-3 h-3" />
                        {dueBadge?.label === 'Overdue' ? 'Overdue — ' : dueBadge?.label === 'Today' ? 'Today — ' : ''}
                        {format(new Date(task.due_date), 'dd MMM')}
                      </span>
                    )}
                    {notes.length > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        {notes.length} note{notes.length === 1 ? '' : 's'}
                      </span>
                    )}
                    {checklist.length > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3" /> {checklist.filter(c => c.done).length}/{checklist.length}
                      </span>
                    )}
                    {task.lead_name && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        onClick={() => task.lead_id && onOpenDeal?.(task.lead_id)}
                        title="Open deal"
                      >
                        <User className="w-3 h-3" /> {task.lead_name}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t mx-2.5">
                <div className="bg-background rounded-lg p-4 space-y-4" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
                  {!task.completed && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Task title</Label>
                      <Input
                        placeholder="Enter a task title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="h-11 text-base font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Checklist</Label>
                    {checklist.length > 0 && (
                      <div className="space-y-1">
                        {checklist.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 group">
                            <TaskCircleCheck checked={item.done} onCheckedChange={() => toggleItem(idx)} className="h-4 w-4 shrink-0" />
                            <Input
                              value={item.text}
                              onChange={e => updateItemText(idx, e.target.value)}
                              placeholder="List item..."
                              className={cn(
                                'h-7 text-xs border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary',
                                item.done && 'line-through text-muted-foreground'
                              )}
                            />
                            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => removeItem(idx)} title="Remove item">
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

                  {description && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="text-sm resize-y border-0 bg-muted/40 focus-visible:ring-0" />
                    </div>
                  )}

                  {notes.length > 0 && (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {notes.map(n => (
                        <div key={n.id} className="bg-muted/50 rounded-md p-3 text-sm">
                          <p className="whitespace-pre-wrap leading-relaxed">{n.content.replace(/^📋 \[Task: .*?\] /, '')}</p>
                          <p className="text-xs text-muted-foreground mt-1.5">{format(new Date(n.created_at), 'dd MMM, HH:mm')}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <div className="rounded-md border bg-background">
                      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b bg-muted/40">
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Bold"
                          onClick={() => applyTextFormat(noteRef.current, setNoteText, (v, s, e) => {
                            const sel = v.slice(s, e) || 'text';
                            return { value: v.slice(0, s) + '**' + sel + '**' + v.slice(e), cursor: s + 2 + sel.length + 2 };
                          })}><Bold className="w-3.5 h-3.5" /></Button>
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Italic"
                          onClick={() => applyTextFormat(noteRef.current, setNoteText, (v, s, e) => {
                            const sel = v.slice(s, e) || 'text';
                            return { value: v.slice(0, s) + '_' + sel + '_' + v.slice(e), cursor: s + 1 + sel.length + 1 };
                          })}><Italic className="w-3.5 h-3.5" /></Button>
                        <div className="w-px h-4 bg-border mx-1" />
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Bullet list"
                          onClick={() => applyTextFormat(noteRef.current, setNoteText, (v, s, e) => {
                            const ls = v.lastIndexOf('\n', s - 1) + 1;
                            const le = v.indexOf('\n', e); const end = le === -1 ? v.length : le;
                            const block = v.slice(ls, end) || '';
                            const next = v.slice(0, ls) + block.split('\n').map(l => '• ' + l).join('\n') + v.slice(end);
                            return { value: next, cursor: next.length - (v.length - end) };
                          })}><List className="w-3.5 h-3.5" /></Button>
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Numbered list"
                          onClick={() => applyTextFormat(noteRef.current, setNoteText, (v, s, e) => {
                            const ls = v.lastIndexOf('\n', s - 1) + 1;
                            const le = v.indexOf('\n', e); const end = le === -1 ? v.length : le;
                            const block = v.slice(ls, end) || '';
                            const next = v.slice(0, ls) + block.split('\n').map((l, i) => `${i + 1}. ` + l).join('\n') + v.slice(end);
                            return { value: next, cursor: next.length - (v.length - end) };
                          })}><ListOrdered className="w-3.5 h-3.5" /></Button>
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="To-do list"
                          onClick={() => applyTextFormat(noteRef.current, setNoteText, (v, s, e) => {
                            const ls = v.lastIndexOf('\n', s - 1) + 1;
                            const le = v.indexOf('\n', e); const end = le === -1 ? v.length : le;
                            const block = v.slice(ls, end) || '';
                            const next = v.slice(0, ls) + block.split('\n').map(l => '◯ ' + l).join('\n') + v.slice(end);
                            return { value: next, cursor: next.length - (v.length - end) };
                          })}><ListChecks className="w-3.5 h-3.5" /></Button>
                      </div>
                      <Textarea
                        ref={noteRef}
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        placeholder="Add a note to this task..."
                        rows={6}
                        className="text-sm resize-y min-h-[140px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }}
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button size="sm" disabled={!noteText.trim()} onClick={addNote}>
                        <Send className="w-3.5 h-3.5 mr-1.5" /> Add note
                      </Button>
                    </div>
                  </div>

                  {!task.completed && (
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1.5">Quick follow-up</p>
                      <div className="flex flex-wrap gap-1.5">
                        {FOLLOW_UP_OPTIONS.map(opt => {
                          const targetDate = getFollowUpDate(opt);
                          const formatted = formatDatetimeLocal(targetDate);
                          const isSelected = dueLocal === formatted;
                          return (
                            <Button key={opt.label} type="button" variant={isSelected ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-2.5" onClick={() => setDueLocal(formatted)}>
                              {opt.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!task.completed && (
                    <div className="flex items-center gap-2 pt-1 border-t">
                      <div className="flex-1">
                        <Label className="text-[11px] text-muted-foreground">Due date</Label>
                        <Input
                          type="date"
                          value={dueLocal ? dueLocal.slice(0, 10) : ''}
                          onChange={e => setDueLocal(e.target.value ? `${e.target.value}T09:00` : '')}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-[11px] text-muted-foreground">Assign to</Label>
                        <AssigneePicker value={assignee} onChange={setAssignee} size="sm" />
                      </div>
                      <div className="self-end">
                        <Button size="sm" onClick={save} disabled={saving || !title.trim()}>
                          <Save className="w-3.5 h-3.5 mr-1.5" /> {saving ? 'Saving…' : 'Save changes'}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t">
                    <Button variant={task.completed ? 'outline' : 'default'} size="sm" className="h-8 text-xs px-3" onClick={toggleComplete}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      {task.completed ? 'Reopen task' : 'Mark complete'}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive px-2" onClick={removeTask}>
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete task
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}