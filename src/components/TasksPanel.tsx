import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SAMPLE_TASKS } from '@/lib/sample-data';
import { TasksKanban } from '@/components/TasksKanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from 'sonner';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { Plus, Calendar, User, AlertTriangle, List, Columns, ChevronsUpDown, Check, UserPlus } from 'lucide-react';

type DueFilter = 'all' | 'overdue' | 'today' | 'tomorrow' | 'later' | 'no_date';

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
  onOpenLead?: (leadId: string) => void;
}

function getTaskDueCategory(task: Task): DueFilter {
  if (!task.due_date) return 'no_date';
  const d = new Date(task.due_date);
  if (isToday(d)) return 'today';
  if (isTomorrow(d)) return 'tomorrow';
  if (isPast(d)) return 'overdue';
  return 'later';
}

const DUE_FILTER_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'later', label: 'Later' },
  { value: 'no_date', label: 'No Date' },
];

export function TasksPanel({ leads, onOpenLead }: TasksPanelProps) {
  const { user, isPreviewMode } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLeadId, setNewLeadId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [customClientName, setCustomClientName] = useState('');
  const [useCustomClient, setUseCustomClient] = useState(false);

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
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null } : t));
      toast.success(completed ? 'Task completed' : 'Task reopened');
      return;
    }
    await supabase.from('tasks').update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq('id', task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null } : t));
    toast.success(completed ? 'Task completed' : 'Task reopened');
  };

  const createTask = async () => {
    if (!newTitle.trim()) return;
    
    let leadId = newLeadId;
    let leadName = '';

    if (useCustomClient) {
      if (!customClientName.trim()) { toast.error('Enter a client name'); return; }
      const parts = customClientName.trim().split(/\s+/);
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || 'Unknown';

      if (isPreviewMode) {
        leadId = `preview-lead-${Date.now()}`;
        leadName = customClientName.trim();
      } else {
        // Create a new lead for this client
        const { data: newLead, error: leadError } = await supabase.from('leads').insert({
          first_name: firstName,
          last_name: lastName,
          broker_id: user!.id,
          status: 'new',
        } as any).select('id').single();
        if (leadError || !newLead) { toast.error('Failed to create client'); return; }
        leadId = newLead.id;
        leadName = customClientName.trim();
      }
    } else {
      if (!leadId) { toast.error('Select a lead or add a new client'); return; }
      const lead = leads.find(l => l.id === leadId);
      leadName = lead ? `${lead.first_name} ${lead.last_name}` : 'Unknown';
    }

    if (isPreviewMode) {
      const fakeTask: Task = {
        id: `preview-${Date.now()}`,
        lead_id: leadId,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
        completed: false,
        completed_at: null,
        created_at: new Date().toISOString(),
        lead_name: leadName,
      };
      setTasks(prev => [fakeTask, ...prev]);
      toast.success('Task created (preview)');
    } else {
      const { error } = await supabase.from('tasks').insert({
        lead_id: leadId,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
        created_by: user!.id,
      });
      if (error) { toast.error('Failed to create task'); return; }
      toast.success('Task created');
      fetchTasks();
    }
    setNewTitle(''); setNewDesc(''); setNewLeadId(''); setNewDueDate('');
    setCustomClientName(''); setUseCustomClient(false);
    setDialogOpen(false);
  };

  // Counts for filter badges
  const dueCounts = useMemo(() => {
    const active = tasks.filter(t => !t.completed);
    return {
      all: active.length,
      overdue: active.filter(t => getTaskDueCategory(t) === 'overdue').length,
      today: active.filter(t => getTaskDueCategory(t) === 'today').length,
      tomorrow: active.filter(t => getTaskDueCategory(t) === 'tomorrow').length,
      later: active.filter(t => getTaskDueCategory(t) === 'later').length,
      no_date: active.filter(t => getTaskDueCategory(t) === 'no_date').length,
    };
  }, [tasks]);

  const displayed = useMemo(() => {
    let result = tasks.filter(t => showCompleted || !t.completed);
    if (dueFilter !== 'all') {
      result = result.filter(t => {
        if (t.completed) return true; // show completed in any filter when toggled
        return getTaskDueCategory(t) === dueFilter;
      });
    }
    return result;
  }, [tasks, showCompleted, dueFilter]);

  if (loading) return <p className="text-muted-foreground text-center py-12">Loading tasks...</p>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Follow-up Tasks</h2>
          {dueCounts.overdue > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" /> {dueCounts.overdue} overdue
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border rounded-md">
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2" onClick={() => setViewMode('list')}>
              <List className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === 'kanban' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2" onClick={() => setViewMode('kanban')}>
              <Columns className="w-4 h-4" />
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <Checkbox checked={showCompleted} onCheckedChange={(v) => setShowCompleted(v === true)} />
            Completed
          </label>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Follow-up Task</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Lead *</Label>
                  {useCustomClient ? (
                    <div className="space-y-2">
                      <Input
                        value={customClientName}
                        onChange={e => setCustomClientName(e.target.value)}
                        placeholder="Enter client name (e.g. John Smith)"
                        autoFocus
                      />
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setUseCustomClient(false); setCustomClientName(''); }}>
                        ← Select existing lead instead
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Popover open={leadSearchOpen} onOpenChange={setLeadSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                            {newLeadId ? (() => { const l = leads.find(x => x.id === newLeadId); return l ? `${l.first_name} ${l.last_name}` : 'Select a lead...'; })() : 'Search leads...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search by name..." />
                            <CommandList>
                              <CommandEmpty>No leads found.</CommandEmpty>
                              <CommandGroup>
                                {leads.map(l => (
                                  <CommandItem
                                    key={l.id}
                                    value={`${l.first_name} ${l.last_name}`}
                                    onSelect={() => { setNewLeadId(l.id); setLeadSearchOpen(false); }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${newLeadId === l.id ? 'opacity-100' : 'opacity-0'}`} />
                                    {l.first_name} {l.last_name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => { setUseCustomClient(true); setNewLeadId(''); }}>
                        <UserPlus className="w-3 h-3" /> Add new client
                      </Button>
                    </div>
                  )}
                </div>
                <div><Label>Task Title *</Label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Call back after 5pm" /></div>
                <div><Label>Description</Label><Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional details..." rows={2} /></div>
                <div><Label>Due Date</Label><Input type="datetime-local" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} /></div>
                <Button onClick={createTask} disabled={!newTitle.trim() || (!newLeadId && !useCustomClient) || (useCustomClient && !customClientName.trim())} className="w-full">Create Task</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Due date filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {DUE_FILTER_OPTIONS.map(opt => {
          const count = dueCounts[opt.value];
          const isActive = dueFilter === opt.value;
          return (
            <Button
              key={opt.value}
              variant={isActive ? 'secondary' : 'ghost'}
              size="sm"
              className={`h-8 text-xs gap-1.5 ${opt.value === 'overdue' && count > 0 && !isActive ? 'text-destructive' : ''}`}
              onClick={() => setDueFilter(opt.value)}
            >
              {opt.label}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-background text-foreground' :
                  opt.value === 'overdue' && count > 0 ? 'bg-destructive/10 text-destructive' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {count}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* View */}
      {viewMode === 'kanban' ? (
        <TasksKanban tasks={displayed.filter(t => !t.completed)} onToggleComplete={toggleComplete} onOpenLead={onOpenLead} />
      ) : (
        <>
          {displayed.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              {dueFilter === 'all' ? 'No tasks yet — create one to get started' : `No ${dueFilter === 'no_date' ? 'unscheduled' : dueFilter} tasks`}
            </p>
          ) : (
            <div className="space-y-2">
              {displayed.map(task => {
                const cat = getTaskDueCategory(task);
                const isOverdue = !task.completed && cat === 'overdue';
                const isDueToday = !task.completed && cat === 'today';
                return (
                  <Card key={task.id} className={`transition-opacity cursor-pointer hover:bg-muted/50 ${task.completed ? 'opacity-60' : ''} ${isOverdue ? 'border-destructive/50' : ''}`}
                    onClick={() => onOpenLead?.(task.lead_id)}>
                    <CardContent className="py-3 px-4 flex items-start gap-3">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={task.completed} onCheckedChange={() => toggleComplete(task)} className="mt-1" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                        {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground"><User className="w-3 h-3" /> {task.lead_name}</span>
                          {task.due_date && (
                            <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-destructive font-medium' : isDueToday ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                              <Calendar className="w-3 h-3" />
                              {isOverdue ? 'Overdue — ' : isDueToday ? 'Today — ' : cat === 'tomorrow' ? 'Tomorrow — ' : ''}
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
        </>
      )}
    </div>
  );
}

export { getTaskDueCategory };
export type { Task as TaskItem, DueFilter };
