import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SAMPLE_TASKS } from '@/lib/sample-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, isPast, isToday } from 'date-fns';
import { Plus, Calendar, User, AlertTriangle } from 'lucide-react';

interface Task {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  lead_name?: string;
}

interface TasksPanelProps {
  leads: Array<{ id: string; first_name: string; last_name: string }>;
}

export function TasksPanel({ leads }: TasksPanelProps) {
  const { user, isPreviewMode } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New task form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLeadId, setNewLeadId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  useEffect(() => {
    if (isPreviewMode) {
      setTasks(SAMPLE_TASKS as Task[]);
      setLoading(false);
      return;
    }
    fetchTasks();
  }, [isPreviewMode]);

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*, leads(first_name, last_name)')
      .order('due_date', { ascending: true, nullsFirst: false });

    const mapped = (data || []).map((t: any) => ({
      ...t,
      lead_name: t.leads ? `${t.leads.first_name} ${t.leads.last_name}` : 'Unknown',
    }));
    setTasks(mapped);
    setLoading(false);
  };

  const toggleComplete = async (task: Task) => {
    const completed = !task.completed;
    if (isPreviewMode) {
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id
            ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null }
            : t
        )
      );
      toast.success(completed ? 'Task completed' : 'Task reopened');
      return;
    }
    await supabase
      .from('tasks')
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq('id', task.id);
    setTasks(prev =>
      prev.map(t =>
        t.id === task.id
          ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null }
          : t
      )
    );
    toast.success(completed ? 'Task completed' : 'Task reopened');
  };

  const createTask = async () => {
    if (!newTitle.trim() || !newLeadId) return;
    if (isPreviewMode) {
      const lead = leads.find(l => l.id === newLeadId);
      const fakeTask: Task = {
        id: `preview-${Date.now()}`,
        lead_id: newLeadId,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
        completed: false,
        completed_at: null,
        created_at: new Date().toISOString(),
        lead_name: lead ? `${lead.first_name} ${lead.last_name}` : 'Unknown',
      };
      setTasks(prev => [fakeTask, ...prev]);
      toast.success('Task created (preview)');
    } else {
      const { error } = await supabase.from('tasks').insert({
        lead_id: newLeadId,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
        created_by: user!.id,
      });
      if (error) {
        toast.error('Failed to create task');
        return;
      }
      toast.success('Task created');
      fetchTasks();
    }
    setNewTitle('');
    setNewDesc('');
    setNewLeadId('');
    setNewDueDate('');
    setDialogOpen(false);
  };

  const displayed = tasks.filter(t => showCompleted || !t.completed);
  const overdue = tasks.filter(t => !t.completed && t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));

  if (loading) {
    return <p className="text-muted-foreground text-center py-12">Loading tasks...</p>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Follow-up Tasks</h2>
          {overdue.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" /> {overdue.length} overdue
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <Checkbox checked={showCompleted} onCheckedChange={(v) => setShowCompleted(v === true)} />
            Show completed
          </label>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Follow-up Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Lead *</Label>
                  <select
                    value={newLeadId}
                    onChange={e => setNewLeadId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select a lead...</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Task Title *</Label>
                  <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Call back after 5pm" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional details..." rows={2} />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="datetime-local" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
                </div>
                <Button onClick={createTask} disabled={!newTitle.trim() || !newLeadId} className="w-full">
                  Create Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Task List */}
      {displayed.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No tasks yet — create one to get started</p>
      ) : (
        <div className="space-y-2">
          {displayed.map(task => {
            const isOverdue = !task.completed && task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
            const isDueToday = task.due_date && isToday(new Date(task.due_date));
            return (
              <Card key={task.id} className={`transition-opacity ${task.completed ? 'opacity-60' : ''} ${isOverdue ? 'border-destructive/50' : ''}`}>
                <CardContent className="py-3 px-4 flex items-start gap-3">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleComplete(task)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="w-3 h-3" /> {task.lead_name}
                      </span>
                      {task.due_date && (
                        <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-destructive font-medium' : isDueToday ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                          <Calendar className="w-3 h-3" />
                          {isOverdue ? 'Overdue — ' : isDueToday ? 'Today — ' : ''}
                          {format(new Date(task.due_date), 'dd MMM, HH:mm')}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
