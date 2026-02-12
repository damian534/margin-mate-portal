import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LeadStatus } from '@/hooks/useLeadStatuses';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { format, isPast, isToday } from 'date-fns';
import {
  Mail, Phone, Send, Trash2, Users, Building2, DollarSign,
  Calendar, Plus, CheckCircle, Clock, AlertTriangle,
  MessageSquare, Activity, ChevronDown, ChevronRight, Pencil, X, Save
} from 'lucide-react';

interface Lead {
  id: string;
  referral_partner_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  loan_amount: number | null;
  loan_purpose: string | null;
  status: string;
  custom_fields: Record<string, string>;
  created_at: string;
  updated_at: string;
  referrer_commission: number | null;
  referrer_commission_type: string;
  referrer_commission_paid: boolean;
  company_commission: number | null;
  company_commission_type: string;
  company_commission_paid: boolean;
  source: string | null;
  source_contact_id: string | null;
}

interface Note {
  id: string;
  content: string;
  notify_partner: boolean;
  created_at: string;
  author_id: string | null;
  task_id?: string | null;
}

interface Task {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

interface LeadDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  statuses: LeadStatus[];
  referrerName: string | null;
  referrerCompany: string | null;
  isPreviewMode: boolean;
  onUpdateStatus: (leadId: string, status: string) => void;
  onUpdateCommission: (leadId: string, fields: Record<string, any>) => void;
  onDeleteLead: (leadId: string) => void;
  onLeadChange: (lead: Lead) => void;
  onOpenContact?: (contactId: string) => void;
  sampleNotes?: Note[];
}

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

export function LeadDetailSheet({
  open, onOpenChange, lead, statuses, referrerName, referrerCompany,
  isPreviewMode, onUpdateStatus, onUpdateCommission, onDeleteLead, onLeadChange, onOpenContact, sampleNotes
}: LeadDetailSheetProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newNote, setNewNote] = useState('');
  const [notifyPartner, setNotifyPartner] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [activeTab, setActiveTab] = useState('timeline');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<{ id: string; title: string; dueDate: string } | null>(null);
  const [taskNoteText, setTaskNoteText] = useState('');

  useEffect(() => {
    if (lead && open) {
      fetchNotes(lead.id);
      fetchTasks(lead.id);
    }
  }, [lead?.id, open]);

  const fetchNotes = async (leadId: string) => {
    if (isPreviewMode) {
      setNotes(sampleNotes || []);
      return;
    }
    const { data } = await supabase.from('notes').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
    setNotes((data as Note[]) || []);
  };

  const fetchTasks = async (leadId: string) => {
    if (isPreviewMode) {
      setTasks([
        { id: 'pt1', lead_id: leadId, title: 'Follow up on application docs', description: null, due_date: new Date(Date.now() + 86400000).toISOString(), completed: false, completed_at: null, created_at: new Date().toISOString() },
        { id: 'pt2', lead_id: leadId, title: 'Send welcome email', description: null, due_date: null, completed: true, completed_at: new Date().toISOString(), created_at: new Date(Date.now() - 86400000).toISOString() },
      ]);
      return;
    }
    const { data } = await supabase.from('tasks').select('*').eq('lead_id', leadId).order('due_date', { ascending: true, nullsFirst: false });
    setTasks((data as Task[]) || []);
  };

  const addNote = async (content: string, type: 'note' | 'email' | 'call' = 'note', taskId?: string) => {
    if (!content.trim() || !lead || !user) return;
    const noteContent = type === 'email'
      ? `📧 Email sent to ${lead.email}\n${content}`
      : type === 'call'
      ? `📞 Called ${lead.phone}\n${content}`
      : content;

    if (isPreviewMode) {
      const fakeNote: Note = { id: `preview-${Date.now()}`, content: noteContent.trim(), notify_partner: notifyPartner, created_at: new Date().toISOString(), author_id: user.id, task_id: taskId || null };
      setNotes(prev => [fakeNote, ...prev]);
      toast.success('Note added (preview)');
      if (!taskId) { setNewNote(''); setNotifyPartner(false); }
      return;
    }
    const insertData: any = { lead_id: lead.id, author_id: user.id, content: noteContent.trim(), notify_partner: notifyPartner };
    if (taskId) insertData.task_id = taskId;
    const { error } = await supabase.from('notes').insert(insertData);
    if (error) { toast.error('Failed to add note'); return; }
    toast.success(notifyPartner ? 'Note added & partner notified' : 'Note added');
    if (!taskId) { setNewNote(''); setNotifyPartner(false); }
    fetchNotes(lead.id);
  };

  const addTaskNote = async (taskId: string) => {
    if (!taskNoteText.trim() || !lead || !user) return;
    const task = tasks.find(t => t.id === taskId);
    const content = `📋 [Task: ${task?.title}] ${taskNoteText.trim()}`;
    await addNote(content, 'note', taskId);
    setTaskNoteText('');
  };

  const createTask = async () => {
    if (!newTaskTitle.trim() || !lead || !user) return;
    if (isPreviewMode) {
      const fakeTask: Task = {
        id: `preview-${Date.now()}`, lead_id: lead.id, title: newTaskTitle.trim(),
        description: null, due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null,
        completed: false, completed_at: null, created_at: new Date().toISOString(),
      };
      setTasks(prev => [fakeTask, ...prev].sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }));
      toast.success('Task created (preview)');
    } else {
      const { error } = await supabase.from('tasks').insert({
        lead_id: lead.id, title: newTaskTitle.trim(),
        due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null,
        created_by: user.id,
      });
      if (error) { toast.error('Failed to create task'); return; }
      toast.success('Task created');
      fetchTasks(lead.id);
    }
    setNewTaskTitle(''); setNewTaskDueDate(''); setShowTaskForm(false);
  };

  const updateTask = async (taskId: string) => {
    if (!editingTask) return;
    if (isPreviewMode) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, title: editingTask.title, due_date: editingTask.dueDate ? new Date(editingTask.dueDate).toISOString() : null } : t));
      toast.success('Task updated (preview)');
    } else {
      const { error } = await supabase.from('tasks').update({
        title: editingTask.title,
        due_date: editingTask.dueDate ? new Date(editingTask.dueDate).toISOString() : null,
      }).eq('id', taskId);
      if (error) { toast.error('Failed to update task'); return; }
      toast.success('Task updated');
      fetchTasks(lead!.id);
    }
    setEditingTask(null);
  };

  const deleteTask = async (taskId: string) => {
    if (isPreviewMode) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Task deleted (preview)');
      return;
    }
    await supabase.from('notes').delete().eq('task_id', taskId);
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) { toast.error('Failed to delete task'); return; }
    toast.success('Task deleted');
    fetchTasks(lead!.id);
    fetchNotes(lead!.id);
  };

  const toggleTaskComplete = async (task: Task) => {
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

  const handleEmailClick = () => {
    if (!lead?.email) return;
    window.open(`mailto:${encodeURIComponent(lead.email)}`, '_blank');
    addNote('', 'email');
  };

  const handlePhoneClick = () => {
    if (!lead?.phone) return;
    window.open(`tel:${encodeURIComponent(lead.phone)}`, '_blank');
    addNote('', 'call');
  };

  if (!lead) return null;

  const nextTask = tasks.find(t => !t.completed && t.due_date);
  const overdueTasks = tasks.filter(t => !t.completed && t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  const getTaskNotes = (taskId: string) => notes.filter(n => n.task_id === taskId);

  const renderTaskItem = (task: Task) => {
    const isOverdue = !task.completed && task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
    const isDueToday = !task.completed && task.due_date && isToday(new Date(task.due_date));
    const isExpanded = expandedTaskId === task.id;
    const isEditing = editingTask?.id === task.id;
    const taskNotes = getTaskNotes(task.id);

    return (
      <div key={task.id} className={`rounded-lg border transition-all ${isOverdue ? 'border-destructive/30 bg-destructive/5' : task.completed ? 'opacity-60' : 'bg-background'}`}>
        {isEditing && editingTask ? (
          /* Edit mode — full width form, stop all event propagation */
          <div className="p-3 space-y-2.5" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
            <div>
              <Label className="text-xs text-muted-foreground">Task Title</Label>
              <Input 
                value={editingTask.title} 
                onChange={e => setEditingTask({ ...editingTask, title: e.target.value })} 
                className="h-9 text-sm mt-1" 
                onFocus={e => e.target.select()}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Quick follow-up</Label>
              <div className="flex flex-wrap gap-1.5">
                {FOLLOW_UP_OPTIONS.map(opt => {
                  const targetDate = getFollowUpDate(opt);
                  const formatted = formatDatetimeLocal(targetDate);
                  const isSelected = editingTask.dueDate === formatted;
                  return (
                    <Button key={opt.label} type="button" variant={isSelected ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-2.5"
                      onClick={() => setEditingTask({ ...editingTask, dueDate: formatted })}>
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Custom Date & Time</Label>
              <Input type="datetime-local" value={editingTask.dueDate} onChange={e => setEditingTask({ ...editingTask, dueDate: e.target.value })} className="h-9 text-sm mt-1" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="h-8 text-xs px-4 flex-1" onClick={() => updateTask(task.id)} disabled={!editingTask.title.trim()}>
                <Save className="w-3.5 h-3.5 mr-1.5" /> Save Changes
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs px-3" onClick={() => setEditingTask(null)}>Cancel</Button>
            </div>
          </div>
        ) : (
          /* View mode */
          <div className="flex items-start gap-2 p-2.5">
            <Checkbox checked={task.completed} onCheckedChange={() => toggleTaskComplete(task)} className="mt-0.5" />
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
              <p className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {task.due_date && (
                  <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-destructive' : isDueToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    <Calendar className="w-3 h-3" />
                    {isOverdue ? 'Overdue — ' : isDueToday ? 'Today — ' : ''}
                    {format(new Date(task.due_date), 'dd MMM, HH:mm')}
                  </span>
                )}
                {taskNotes.length > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <MessageSquare className="w-3 h-3" /> {taskNotes.length}
                  </span>
                )}
                {isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              </div>
            </div>
            {!task.completed && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => {
                e.stopPropagation();
                setExpandedTaskId(task.id);
                setEditingTask({
                  id: task.id,
                  title: task.title,
                  dueDate: task.due_date ? formatDatetimeLocal(new Date(task.due_date)) : '',
                });
              }}>
                <Pencil className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}

        {/* Expanded: task notes + add note */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-0 border-t mx-2.5 mt-0">
            <div className="pt-2 space-y-2">
              {taskNotes.length > 0 && (
                <div className="space-y-1.5">
                  {taskNotes.map(n => (
                    <div key={n.id} className="bg-muted/50 rounded p-2 text-xs">
                      <p className="whitespace-pre-wrap">{n.content.replace(/^📋 \[Task: .*?\] /, '')}</p>
                      <p className="text-muted-foreground mt-1">{format(new Date(n.created_at), 'dd MMM, HH:mm')}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5">
                <Input placeholder="Add a note to this task..." value={taskNoteText} onChange={e => setTaskNoteText(e.target.value)}
                  className="h-7 text-xs" onKeyDown={e => { if (e.key === 'Enter') addTaskNote(task.id); }} />
                <Button size="sm" className="h-7 text-xs px-2" disabled={!taskNoteText.trim()} onClick={() => addTaskNote(task.id)}>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive hover:text-destructive px-2" onClick={() => deleteTask(task.id)}>
                <Trash2 className="w-3 h-3 mr-1" /> Delete task
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        {/* Contact Header Card */}
        <div className="bg-muted/30 p-6 pb-4 border-b">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-xl flex items-center gap-2">
              <div 
                className={`w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm ${lead.source_contact_id && onOpenContact ? 'cursor-pointer hover:bg-primary/20 transition-colors' : ''}`}
                onClick={() => lead.source_contact_id && onOpenContact?.(lead.source_contact_id)}
                title={lead.source_contact_id ? 'View contact card' : undefined}
              >
                {lead.first_name[0]}{lead.last_name[0]}
              </div>
              <div>
                <span 
                  className={lead.source_contact_id && onOpenContact ? 'cursor-pointer hover:text-primary transition-colors' : ''}
                  onClick={() => lead.source_contact_id && onOpenContact?.(lead.source_contact_id)}
                >
                  {lead.first_name} {lead.last_name}
                </span>
                {lead.loan_purpose && (
                  <p className="text-sm font-normal text-muted-foreground">{lead.loan_purpose}</p>
                )}
                {lead.source_contact_id && onOpenContact && (
                  <button 
                    onClick={() => onOpenContact(lead.source_contact_id!)}
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <Users className="w-3 h-3" /> View contact card
                  </button>
                )}
              </div>
            </SheetTitle>
          </SheetHeader>

          {/* Quick contact actions */}
          <div className="flex gap-2 mb-4">
            {lead.email && (
              <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={handleEmailClick}>
                <Mail className="w-3.5 h-3.5" /> Email
              </Button>
            )}
            {lead.phone && (
              <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={handlePhoneClick}>
                <Phone className="w-3.5 h-3.5" /> Call
              </Button>
            )}
          </div>

          {/* Contact details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {lead.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <a href={`mailto:${encodeURIComponent(lead.email)}`} className="text-primary hover:underline truncate" onClick={(e) => { e.preventDefault(); handleEmailClick(); }}>
                  {lead.email}
                </a>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <a href={`tel:${encodeURIComponent(lead.phone)}`} className="text-primary hover:underline" onClick={(e) => { e.preventDefault(); handlePhoneClick(); }}>
                  {lead.phone}
                </a>
              </div>
            )}
            {lead.loan_amount && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium">${lead.loan_amount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Created {format(new Date(lead.created_at), 'dd MMM yyyy')}</span>
            </div>
          </div>

          {/* Referrer banner */}
          {referrerName && (
            <div className="mt-3 bg-primary/5 rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Referred by <strong>{referrerName}</strong></span>
              {referrerCompany && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {referrerCompany}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Status + Next Task Row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Status</Label>
              <Select value={lead.status} onValueChange={(v) => onUpdateStatus(lead.id, v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map(s => <SelectItem key={s.name} value={s.name}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Next Task</Label>
              <div className="mt-1 h-10 flex items-center">
                {nextTask ? (
                  <div className={`text-sm flex items-center gap-1.5 ${
                    overdueTasks.some(t => t.id === nextTask.id) ? 'text-destructive' :
                    nextTask.due_date && isToday(new Date(nextTask.due_date)) ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {overdueTasks.some(t => t.id === nextTask.id) ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    <span className="truncate">{nextTask.title}</span>
                    {nextTask.due_date && (
                      <span className="text-xs whitespace-nowrap">
                        ({format(new Date(nextTask.due_date), 'dd MMM')})
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No upcoming tasks</span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Tabs: Timeline (Tasks + Activity), Commission */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="timeline" className="gap-1.5 text-xs">
                <Activity className="w-3.5 h-3.5" /> Timeline
                {pendingTasks.length > 0 && (
                  <span className="ml-1 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">{pendingTasks.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="commission" className="gap-1.5 text-xs">
                <DollarSign className="w-3.5 h-3.5" /> Commission
              </TabsTrigger>
            </TabsList>

            {/* Timeline Tab — Tasks stacked above Activity */}
            <TabsContent value="timeline" className="mt-4 space-y-4">
              {/* Tasks Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Tasks
                    {overdueTasks.length > 0 && (
                      <span className="text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                        {overdueTasks.length} overdue
                      </span>
                    )}
                  </h4>
                  <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowTaskForm(!showTaskForm)}>
                    <Plus className="w-3 h-3" /> Add Task
                  </Button>
                </div>

                {/* New task form */}
                {showTaskForm && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                    <Input placeholder="Task title..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="h-8 text-sm" />
                    {/* Quick follow-up buttons */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Quick follow-up</p>
                      <div className="flex flex-wrap gap-1.5">
                        {FOLLOW_UP_OPTIONS.map(opt => {
                          const targetDate = getFollowUpDate(opt);
                          const isSelected = newTaskDueDate && Math.abs(new Date(newTaskDueDate).getTime() - targetDate.getTime()) < 60000;
                          return (
                            <Button key={opt.label} type="button" variant={isSelected ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-2.5"
                              onClick={() => setNewTaskDueDate(formatDatetimeLocal(getFollowUpDate(opt)))}>
                              {opt.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input type="datetime-local" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} className="h-8 text-sm flex-1" />
                      <Button size="sm" className="h-8 text-xs" onClick={createTask} disabled={!newTaskTitle.trim()}>Create</Button>
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setShowTaskForm(false); setNewTaskTitle(''); setNewTaskDueDate(''); }}>Cancel</Button>
                    </div>
                  </div>
                )}

                {/* Task list */}
                {pendingTasks.length === 0 && !showTaskForm ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No pending tasks</p>
                ) : (
                  <div className="space-y-1.5">
                    {pendingTasks.map(renderTaskItem)}
                  </div>
                )}

                {completedTasks.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                      <ChevronRight className="w-3 h-3" />
                      {completedTasks.length} completed
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1.5 mt-1.5">
                      {completedTasks.map(renderTaskItem)}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>

              <Separator />

              {/* Activity Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Activity
                </h4>

                {/* Add note form */}
                <div className="space-y-2">
                  <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Log a note, call summary, or update..." rows={2} maxLength={2000} />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox id="notify-detail" checked={notifyPartner} onCheckedChange={(v) => setNotifyPartner(v === true)} />
                      <Label htmlFor="notify-detail" className="text-xs cursor-pointer">Notify partner</Label>
                    </div>
                    <Button onClick={() => addNote(newNote)} disabled={!newNote.trim()} size="sm" className="gap-1.5">
                      <Send className="w-3.5 h-3.5" /> Log
                    </Button>
                  </div>
                </div>

                {/* Activity timeline */}
                <ScrollArea className="h-56">
                  {notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
                  ) : (
                    <div className="relative pl-6 space-y-0">
                      <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                      {notes.map((note) => {
                        const isEmail = note.content.startsWith('📧');
                        const isCall = note.content.startsWith('📞');
                        const isTaskNote = note.content.startsWith('📋');
                        return (
                          <div key={note.id} className="relative pb-3">
                            <div className={`absolute -left-[14px] top-1.5 w-3 h-3 rounded-full border-2 border-background ${
                              isEmail ? 'bg-blue-500' : isCall ? 'bg-green-500' : isTaskNote ? 'bg-amber-500' : 'bg-muted-foreground/40'
                            }`} />
                            <div className="bg-muted/50 rounded-lg p-2.5">
                              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground">{format(new Date(note.created_at), 'dd MMM yyyy, HH:mm')}</p>
                                {note.notify_partner && <span className="text-xs bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded">Partner notified</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Commission Tab */}
            <TabsContent value="commission" className="mt-4 space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Referrer Commission</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Amount ($)</Label>
                    <Input type="number" placeholder="0.00" value={lead.referrer_commission ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : null;
                        onLeadChange({ ...lead, referrer_commission: val });
                      }}
                      onBlur={() => onUpdateCommission(lead.id, { referrer_commission: lead.referrer_commission })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={lead.referrer_commission_type}
                      onValueChange={(v) => {
                        onLeadChange({ ...lead, referrer_commission_type: v });
                        onUpdateCommission(lead.id, { referrer_commission_type: v });
                      }}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_lead">Per Lead</SelectItem>
                        <SelectItem value="on_settlement">On Settlement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="ref-paid-detail" checked={lead.referrer_commission_paid}
                    onCheckedChange={(v) => {
                      const paid = v === true;
                      onLeadChange({ ...lead, referrer_commission_paid: paid });
                      onUpdateCommission(lead.id, { referrer_commission_paid: paid });
                    }} />
                  <Label htmlFor="ref-paid-detail" className="text-xs cursor-pointer">Paid</Label>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Company/Agency Commission</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Amount ($)</Label>
                    <Input type="number" placeholder="0.00" value={lead.company_commission ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : null;
                        onLeadChange({ ...lead, company_commission: val });
                      }}
                      onBlur={() => onUpdateCommission(lead.id, { company_commission: lead.company_commission })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={lead.company_commission_type}
                      onValueChange={(v) => {
                        onLeadChange({ ...lead, company_commission_type: v });
                        onUpdateCommission(lead.id, { company_commission_type: v });
                      }}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_lead">Per Lead</SelectItem>
                        <SelectItem value="on_settlement">On Settlement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="co-paid-detail" checked={lead.company_commission_paid}
                    onCheckedChange={(v) => {
                      const paid = v === true;
                      onLeadChange({ ...lead, company_commission_paid: paid });
                      onUpdateCommission(lead.id, { company_commission_paid: paid });
                    }} />
                  <Label htmlFor="co-paid-detail" className="text-xs cursor-pointer">Paid</Label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Delete */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="w-full gap-2">
                <Trash2 className="w-4 h-4" /> Delete Lead
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {lead.first_name} {lead.last_name} and all associated notes and tasks. Contact records will not be affected. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDeleteLead(lead.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}
