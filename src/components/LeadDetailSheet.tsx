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
import { toast } from 'sonner';
import { format, isPast, isToday, isFuture } from 'date-fns';
import {
  Mail, Phone, Send, Trash2, Users, Building2, DollarSign,
  Calendar, Plus, CheckCircle, Clock, AlertTriangle, ExternalLink,
  MessageSquare, FileText, Activity
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
  sampleNotes?: Note[];
}

export function LeadDetailSheet({
  open, onOpenChange, lead, statuses, referrerName, referrerCompany,
  isPreviewMode, onUpdateStatus, onUpdateCommission, onDeleteLead, onLeadChange, sampleNotes
}: LeadDetailSheetProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newNote, setNewNote] = useState('');
  const [notifyPartner, setNotifyPartner] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [activeTab, setActiveTab] = useState('activity');

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

  const addNote = async (content: string, type: 'note' | 'email' | 'call' = 'note') => {
    if (!content.trim() || !lead || !user) return;
    const noteContent = type === 'email'
      ? `📧 Email sent to ${lead.email}\n${content}`
      : type === 'call'
      ? `📞 Called ${lead.phone}\n${content}`
      : content;

    if (isPreviewMode) {
      const fakeNote: Note = { id: `preview-${Date.now()}`, content: noteContent.trim(), notify_partner: notifyPartner, created_at: new Date().toISOString(), author_id: user.id };
      setNotes(prev => [fakeNote, ...prev]);
      toast.success(notifyPartner ? 'Note added & partner notified (preview)' : 'Note added (preview)');
      setNewNote(''); setNotifyPartner(false);
      return;
    }
    const { error } = await supabase.from('notes').insert({ lead_id: lead.id, author_id: user.id, content: noteContent.trim(), notify_partner: notifyPartner });
    if (error) { toast.error('Failed to add note'); return; }
    toast.success(notifyPartner ? 'Note added & partner notified' : 'Note added');
    setNewNote(''); setNotifyPartner(false);
    fetchNotes(lead.id);
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
    // Log activity
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        {/* Contact Header Card */}
        <div className="bg-muted/30 p-6 pb-4 border-b">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-xl flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {lead.first_name[0]}{lead.last_name[0]}
              </div>
              <div>
                <span>{lead.first_name} {lead.last_name}</span>
                {lead.loan_purpose && (
                  <p className="text-sm font-normal text-muted-foreground">{lead.loan_purpose}</p>
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

          {/* Tabs: Activity, Tasks, Commission */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="activity" className="gap-1.5 text-xs">
                <Activity className="w-3.5 h-3.5" /> Activity
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-1.5 text-xs">
                <CheckCircle className="w-3.5 h-3.5" /> Tasks
                {pendingTasks.length > 0 && (
                  <span className="ml-1 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">{pendingTasks.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="commission" className="gap-1.5 text-xs">
                <DollarSign className="w-3.5 h-3.5" /> Commission
              </TabsTrigger>
            </TabsList>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-4 space-y-4">
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
              <ScrollArea className="h-72">
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No activity yet — log your first note above</p>
                ) : (
                  <div className="relative pl-6 space-y-0">
                    {/* Timeline line */}
                    <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                    {notes.map((note, idx) => {
                      const isEmail = note.content.startsWith('📧');
                      const isCall = note.content.startsWith('📞');
                      return (
                        <div key={note.id} className="relative pb-4">
                          {/* Timeline dot */}
                          <div className={`absolute -left-[14px] top-1.5 w-3 h-3 rounded-full border-2 border-background ${
                            isEmail ? 'bg-blue-500' : isCall ? 'bg-green-500' : 'bg-muted-foreground/40'
                          }`} />
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                            <div className="flex items-center gap-2 mt-1.5">
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
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{pendingTasks.length} pending task{pendingTasks.length !== 1 ? 's' : ''}</h4>
                <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setShowTaskForm(!showTaskForm)}>
                  <Plus className="w-3 h-3" /> Add Task
                </Button>
              </div>

              {showTaskForm && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                  <Input placeholder="Task title..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="h-8 text-sm" />
                  
                  {/* Quick follow-up time buttons (Privyr-style) */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Quick follow-up</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Later Today', hours: 3 },
                        { label: 'Tomorrow', days: 1 },
                        { label: '2 Days', days: 2 },
                        { label: '3 Days', days: 3 },
                        { label: '1 Week', days: 7 },
                        { label: '2 Weeks', days: 14 },
                        { label: '1 Month', days: 30 },
                      ].map(opt => {
                        const getDate = () => {
                          const d = new Date();
                          if (opt.hours) { d.setHours(d.getHours() + opt.hours); }
                          else if (opt.days) { d.setDate(d.getDate() + opt.days); d.setHours(9, 0, 0, 0); }
                          return d;
                        };
                        const targetDate = getDate();
                        const isSelected = newTaskDueDate && Math.abs(new Date(newTaskDueDate).getTime() - targetDate.getTime()) < 60000;
                        return (
                          <Button
                            key={opt.label}
                            type="button"
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs px-2.5"
                            onClick={() => {
                              const d = getDate();
                              // Format for datetime-local input
                              const pad = (n: number) => n.toString().padStart(2, '0');
                              const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                              setNewTaskDueDate(formatted);
                            }}
                          >
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

              <ScrollArea className="h-60">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No tasks — create one to get started</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.filter(t => !t.completed).map(task => {
                      const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
                      const isDueToday = task.due_date && isToday(new Date(task.due_date));
                      return (
                        <div key={task.id} className={`flex items-start gap-2 p-2.5 rounded-lg border ${isOverdue ? 'border-destructive/30 bg-destructive/5' : 'bg-background'}`}>
                          <Checkbox checked={task.completed} onCheckedChange={() => toggleTaskComplete(task)} className="mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{task.title}</p>
                            {task.due_date && (
                              <p className={`text-xs mt-0.5 flex items-center gap-1 ${isOverdue ? 'text-destructive' : isDueToday ? 'text-primary' : 'text-muted-foreground'}`}>
                                <Calendar className="w-3 h-3" />
                                {isOverdue ? 'Overdue — ' : isDueToday ? 'Today — ' : ''}
                                {format(new Date(task.due_date), 'dd MMM, HH:mm')}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {tasks.filter(t => t.completed).length > 0 && (
                      <>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider pt-2">Completed</p>
                        {tasks.filter(t => t.completed).map(task => (
                          <div key={task.id} className="flex items-start gap-2 p-2.5 rounded-lg opacity-60">
                            <Checkbox checked={task.completed} onCheckedChange={() => toggleTaskComplete(task)} className="mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm line-through text-muted-foreground">{task.title}</p>
                              {task.completed_at && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Completed {format(new Date(task.completed_at), 'dd MMM')}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Commission Tab */}
            <TabsContent value="commission" className="mt-4 space-y-3">
              {/* Referrer Commission */}
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
              {/* Company Commission */}
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
                  This will permanently delete {lead.first_name} {lead.last_name} and all associated notes and tasks. This action cannot be undone.
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
