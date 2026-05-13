import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LeadStatus } from '@/hooks/useLeadStatuses';
import { AssigneePicker } from '@/components/AssigneePicker';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { format, isPast, isToday } from 'date-fns';
import { notifyPartnerNote } from '@/lib/notifications';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import {
  Mail, Phone, Send, Trash2, Users, Building2, DollarSign, Paperclip, Download,
  Calendar, Plus, CheckCircle, Clock, AlertTriangle,
  MessageSquare, Activity, ChevronDown, ChevronRight, Pencil, X, Save, FileDown,
  Search, ExternalLink, FileText, Copy, Flag, Settings as SettingsIcon,
  Bold, Italic, List, ListOrdered, ListChecks
} from 'lucide-react';
import { DocumentCollectionPanel } from '@/components/factfind/DocumentCollectionPanel';
import { ReferLeadDialog } from '@/components/ReferLeadDialog';
import { SendMilestoneEmailDialog } from '@/components/SendMilestoneEmailDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { CoApplicantPicker } from '@/components/CoApplicantPicker';
import { ProfessionalContactsSection } from '@/components/ProfessionalContactsSection';
import { SubjectToFinanceSection } from '@/components/SubjectToFinanceSection';
import { PreApprovalSection } from '@/components/PreApprovalSection';
import { LoanSplitsEditor } from '@/components/LoanSplitsEditor';
import { SectionCard } from '@/components/lead/SectionCard';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { WIP_STATUSES } from './WIPDashboard';

interface Lead {
  id: string;
  referral_partner_id: string | null;
  broker_id: string | null;
  first_name: string;
  last_name: string;
  opportunity_name?: string | null;
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
  co_applicant_contact_id?: string | null;
  co_applicant_contact_id_2?: string | null;
  co_applicant_contact_id_3?: string | null;
  portal_mode?: 'both' | 'fact_find' | 'documents' | null;
  wip_status?: string | null;
  lodged_date?: string | null;
  approved_date?: string | null;
  settled_date?: string | null;
  estimated_settlement_date?: string | null;
  assigned_to?: string | null;
  doc_reminders_paused?: boolean | null;
  subject_to_finance?: boolean | null;
  finance_due_date?: string | null;
  pre_approval_purchase_price?: number | null;
  pre_approval_loan_amount?: number | null;
  pre_approval_expiry_date?: string | null;
  pre_approval_ftc?: number | null;
}

interface Note {
  id: string;
  content: string;
  notify_partner: boolean;
  created_at: string;
  author_id: string | null;
  task_id?: string | null;
  attachments?: NoteAttachment[];
}

interface NoteAttachment {
  id: string;
  note_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
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
  checklist_items?: { text: string; done: boolean }[];
  assigned_to?: string | null;
}

interface LeadSource {
  name: string;
  label: string;
}

const LOAN_PURPOSE_OPTIONS = [
  { value: 'refinance', label: 'Refinance' },
  { value: 'pre_approval', label: 'Pre Approval' },
  { value: 'construction', label: 'Construction' },
  { value: 'top_up', label: 'Top Up' },
  { value: 'variation', label: 'Variation' },
  { value: 'discharge', label: 'Discharge' },
  { value: 'purchase', label: 'Purchase' },
];

interface ContactOption {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  type?: string;
}

interface ReferrerOption {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
}

interface LeadDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  statuses: LeadStatus[];
  leadSources?: LeadSource[];
  referrerName: string | null;
  referrerCompany: string | null;
  sourceContactName?: string | null;
  contacts?: ContactOption[];
  referrers?: ReferrerOption[];
  isPreviewMode: boolean;
  onUpdateStatus: (leadId: string, status: string) => void;
  onUpdateWipStatus?: (leadId: string, wipStatus: string | null) => void;
  onUpdateCommission: (leadId: string, fields: Record<string, any>) => void;
  onDeleteLead: (leadId: string) => void;
  onDuplicateLead?: (leadId: string) => void;
  onLeadChange: (lead: Lead) => void;
  onOpenContact?: (contactId: string) => void;
  sampleNotes?: Note[];
  onLeadSourcesChanged?: () => void;
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
  open, onOpenChange, lead, statuses, leadSources = [], referrerName, referrerCompany, sourceContactName,
  contacts: contactsList = [], referrers: referrersList = [], isPreviewMode, onUpdateStatus, onUpdateWipStatus, onUpdateCommission, onDeleteLead, onDuplicateLead, onLeadChange, onOpenContact, sampleNotes, onLeadSourcesChanged
}: LeadDetailSheetProps) {
  const { user, role } = useAuth();
  const { members: teamMembers } = useTeamMembers();
  const isSuperAdmin = role === 'super_admin';
  const [notes, setNotes] = useState<Note[]>([]);
  const [brokerOptions, setBrokerOptions] = useState<{ id: string; name: string; email: string | null }[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<{ id: string; name: string; task_title: string; due_in_days: number | null; checklist_items: { text: string }[] }[]>([]);
  const [newNote, setNewNote] = useState('');
  const [notifyPartner, setNotifyPartner] = useState(!!lead?.referral_partner_id);
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const noteFileInputRef = useRef<HTMLInputElement>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const taskDescTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('timeline');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<{ id: string; title: string; dueDate: string } | null>(null);
  const [taskNoteText, setTaskNoteText] = useState('');
  const [sourceContactReferralCount, setSourceContactReferralCount] = useState<number | null>(null);
  const [partnerPickerOpen, setPartnerPickerOpen] = useState(false);
  const [addingSource, setAddingSource] = useState(false);
  const [newSourceLabel, setNewSourceLabel] = useState('');
  const [heroCollapsed, setHeroCollapsed] = usePersistedState<boolean>('crm.deal.tasksHero.collapsed', false);
  const [expandAllOn, setExpandAllOn] = useState(false);
  const [heroNoteFor, setHeroNoteFor] = useState<string | null>(null);
  const [heroNoteText, setHeroNoteText] = useState('');
  const [openHeroTaskId, setOpenHeroTaskId] = useState<string | null>(null);
  const [openHeroTaskSnapshot, setOpenHeroTaskSnapshot] = useState<Task | null>(null);
  const [activeNavKey, setActiveNavKey] = useState<string | null>(null);
  const [extraContacts, setExtraContacts] = useState<any[]>([]);
  const mergedContactsList = (() => {
    if (extraContacts.length === 0) return contactsList;
    const ids = new Set(contactsList.map((c: any) => c.id));
    return [...contactsList, ...extraContacts.filter(c => !ids.has(c.id))];
  })();

  const handleAddSource = async () => {
    const label = newSourceLabel.trim();
    if (!label) return;
    const name = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!name) { toast.error('Invalid source name'); return; }
    if (leadSources.some(s => s.name === name)) {
      toast.error('A source with that name already exists');
      return;
    }
    if (isPreviewMode) {
      toast.success('Source added (preview)');
      setAddingSource(false);
      setNewSourceLabel('');
      return;
    }
    const nextOrder = (leadSources.reduce((m, s: any) => Math.max(m, s.display_order || 0), 0) || 0) + 1;
    const { error } = await supabase.from('lead_sources').insert({ name, label, display_order: nextOrder } as any);
    if (error) { toast.error('Failed to add source'); return; }
    toast.success('Source added');
    setAddingSource(false);
    setNewSourceLabel('');
    onLeadSourcesChanged?.();
    if (lead) {
      onLeadChange?.({ ...lead, source: name });
      await supabase.from('leads').update({ source: name } as any).eq('id', lead.id);
    }
  };

  // Fetch broker options for super admins
  useEffect(() => {
    if (!isSuperAdmin || isPreviewMode) return;
    (async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').in('role', ['broker', 'super_admin']);
      if (!roles?.length) return;
      const brokerIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email').in('user_id', brokerIds);
      setBrokerOptions((profiles || []).map(p => ({ id: p.user_id!, name: p.full_name || p.email || 'Unknown', email: p.email })));
    })();
  }, [isSuperAdmin, isPreviewMode]);

  useEffect(() => {
    if (lead && open) {
      fetchNotes(lead.id);
      fetchTasks(lead.id);
      fetchTaskTemplates();
      setNotifyPartner(!!lead.referral_partner_id);
      if (lead.source_contact_id && !isPreviewMode) {
        supabase.from('leads').select('id', { count: 'exact', head: true })
          .eq('source_contact_id', lead.source_contact_id)
          .then(({ count }) => setSourceContactReferralCount(count ?? 0));
      } else {
        setSourceContactReferralCount(null);
      }
    }
  }, [lead?.id, open]);

  const fetchNotes = async (leadId: string) => {
    if (isPreviewMode) {
      setNotes(sampleNotes || []);
      return;
    }
    const { data } = await supabase.from('notes').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
    const notesArr = (data as Note[]) || [];
    if (notesArr.length) {
      const ids = notesArr.map(n => n.id);
      const { data: atts } = await (supabase as any).from('note_attachments').select('*').in('note_id', ids);
      const byNote: Record<string, NoteAttachment[]> = {};
      ((atts as NoteAttachment[]) || []).forEach(a => {
        (byNote[a.note_id] = byNote[a.note_id] || []).push(a);
      });
      notesArr.forEach(n => { n.attachments = byNote[n.id] || []; });
    }
    setNotes(notesArr);
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
    setTasks(((data as any[]) || []).map(t => ({ ...t, checklist_items: Array.isArray(t.checklist_items) ? t.checklist_items : [] })) as Task[]);
  };

  const fetchTaskTemplates = async () => {
    if (isPreviewMode) { setTaskTemplates([]); return; }
    const { data } = await (supabase as any)
      .from('task_templates')
      .select('id, name, task_title, due_in_days, checklist_items')
      .order('display_order');
    setTaskTemplates(((data as any[]) || []).map(t => ({ ...t, checklist_items: Array.isArray(t.checklist_items) ? t.checklist_items : [] })));
  };

  const applyTaskTemplate = async (templateId: string) => {
    if (!lead || !user) return;
    const tpl = taskTemplates.find(t => t.id === templateId);
    if (!tpl) return;
    const dueDate = tpl.due_in_days != null
      ? new Date(Date.now() + tpl.due_in_days * 86400000).toISOString()
      : null;
    const checklist = tpl.checklist_items.map(it => ({ text: it.text, done: false }));
    if (isPreviewMode) {
      const fakeTask: Task = {
        id: `preview-${Date.now()}`, lead_id: lead.id, title: tpl.task_title,
        description: null, due_date: dueDate, completed: false, completed_at: null,
        created_at: new Date().toISOString(), checklist_items: checklist,
      };
      setTasks(prev => [fakeTask, ...prev]);
      toast.success('Template applied (preview)');
      return;
    }
    const { error } = await (supabase as any).from('tasks').insert({
      lead_id: lead.id, title: tpl.task_title,
      due_date: dueDate, created_by: user.id,
      checklist_items: checklist,
    });
    if (error) { toast.error('Failed to apply template'); return; }
    toast.success('Template applied');
    fetchTasks(lead.id);
  };

  const toggleChecklistItem = async (taskId: string, idx: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const items = (task.checklist_items || []).map((it, i) => i === idx ? { ...it, done: !it.done } : it);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, checklist_items: items } : t));
    if (isPreviewMode) return;
    await (supabase as any).from('tasks').update({ checklist_items: items }).eq('id', taskId);
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
    const { data: inserted, error } = await supabase.from('notes').insert(insertData).select('id').single();
    if (error || !inserted) { toast.error('Failed to add note'); return; }

    // Upload any staged attachments (only for the main timeline form, not task notes)
    if (!taskId && noteFiles.length > 0) {
      for (const file of noteFiles) {
        const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_');
        const path = `${lead.id}/${inserted.id}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from('note-attachments').upload(path, file, { upsert: false });
        if (upErr) { toast.error(`Upload failed: ${file.name}`); continue; }
        await (supabase as any).from('note_attachments').insert({
          note_id: inserted.id,
          lead_id: lead.id,
          file_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          uploaded_by: user.id,
        });
      }
    }
    if (notifyPartner && lead.referral_partner_id) {
      notifyPartnerNote(lead, noteContent.trim()).catch(err => console.error('Email notification failed:', err));
    }
    toast.success(notifyPartner ? 'Note added & partner notified' : 'Note added');
    if (!taskId) { setNewNote(''); setNotifyPartner(false); setNoteFiles([]); }
    fetchNotes(lead.id);
  };

  const downloadAttachment = async (att: NoteAttachment) => {
    const { data, error } = await supabase.storage.from('note-attachments').createSignedUrl(att.file_path, 60);
    if (error || !data?.signedUrl) { toast.error('Could not open file'); return; }
    window.open(data.signedUrl, '_blank');
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
        description: newTaskDescription.trim() || null,
        due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null,
        created_by: user.id,
        assigned_to: newTaskAssignee,
      });
      if (error) { toast.error('Failed to create task'); return; }
      toast.success('Task created');
      fetchTasks(lead.id);
    }
    setNewTaskTitle(''); setNewTaskDueDate(''); setNewTaskDescription(''); setNewTaskAssignee(null); setShowTaskForm(false);
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
      await addNote(completed ? `✅ Task completed: "${task.title}"` : `↩️ Task reopened: "${task.title}"`, 'note', task.id);
      return;
    }
    await supabase.from('tasks').update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq('id', task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null } : t));
    toast.success(completed ? 'Task completed' : 'Task reopened');
    await addNote(completed ? `✅ Task completed: "${task.title}"` : `↩️ Task reopened: "${task.title}"`, 'note', task.id);
  };

  const rescheduleTask = async (taskId: string, dueLocal: string) => {
    const prevTask = tasks.find(t => t.id === taskId);
    const prevDate = prevTask?.due_date ? format(new Date(prevTask.due_date), 'dd MMM yyyy') : 'no date';
    const iso = dueLocal ? new Date(dueLocal).toISOString() : null;
    const newDate = iso ? format(new Date(iso), 'dd MMM yyyy') : 'no date';
    if (prevDate === newDate) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, due_date: iso } : t));
    if (!isPreviewMode) {
      const { error } = await supabase.from('tasks').update({ due_date: iso }).eq('id', taskId);
      if (error) { toast.error('Failed to reschedule'); return; }
    }
    toast.success('Task rescheduled');
    await addNote(`📅 Task rescheduled${prevTask ? ` "${prevTask.title}"` : ''}: ${prevDate} → ${newDate}`, 'note', taskId);
  };

  const reassignTask = async (taskId: string, userId: string | null) => {
    const prevTask = tasks.find(t => t.id === taskId);
    const prevName = prevTask?.assigned_to ? (teamMembers.find(m => m.user_id === prevTask.assigned_to)?.name || 'someone') : 'unassigned';
    const newName = userId ? (teamMembers.find(m => m.user_id === userId)?.name || 'someone') : 'unassigned';
    if (prevTask?.assigned_to === userId) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigned_to: userId } : t));
    if (!isPreviewMode) {
      const { error } = await (supabase as any).from('tasks').update({ assigned_to: userId }).eq('id', taskId);
      if (error) { toast.error('Failed to reassign'); return; }
    }
    toast.success(userId ? 'Task reassigned' : 'Task unassigned');
    await addNote(`👤 Task reassigned${prevTask ? ` "${prevTask.title}"` : ''}: ${prevName} → ${newName}`, 'note', taskId);
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
  const visibleTasks = tasks;
  const overdueTasks = visibleTasks.filter(t => !t.completed && t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
  const pendingTasks = visibleTasks.filter(t => !t.completed);
  const completedTasks = visibleTasks.filter(t => t.completed);

  const overdueColTasks = overdueTasks;
  const todayColTasks = visibleTasks.filter(t => !t.completed && t.due_date && isToday(new Date(t.due_date)));
  const upcomingColTasks = visibleTasks.filter(t =>
    !t.completed && (
      !t.due_date ||
      (!isToday(new Date(t.due_date)) && !isPast(new Date(t.due_date)))
    )
  );

  const getTaskNotes = (taskId: string) => notes.filter(n => n.task_id === taskId);

  const formatDatetimeLocalFromIso = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const renderHeroTask = (task: Task, tone: 'destructive' | 'success' | 'muted') => {
    const taskNotes = getTaskNotes(task.id);
    return (
      <div
        key={task.id}
        className={cn(
          "group rounded-md border bg-background px-2 py-1.5 flex items-start gap-2 hover:shadow-sm transition-all",
          tone === 'destructive' && 'border-destructive/30',
          tone === 'success' && 'border-success/30',
          tone === 'muted' && 'border-border',
        )}
      >
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => toggleTaskComplete(task)}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => { setExpandedTaskId(task.id); setOpenHeroTaskId(task.id); }}
            className="text-left text-xs font-medium leading-snug break-words hover:underline w-full"
          >
            {task.title}
          </button>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Due date */}
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded hover:bg-muted transition-colors",
                  tone === 'destructive' && 'text-destructive',
                  tone === 'success' && 'text-success',
                  tone === 'muted' && 'text-muted-foreground',
                )}>
                  <Clock className="w-3 h-3" />
                  {task.due_date ? format(new Date(task.due_date), 'dd MMM') : 'No date'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 z-[100]" align="start">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">Reschedule</Label>
                  <Input
                    type="date"
                    defaultValue={task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : ''}
                    onBlur={(e) => rescheduleTask(task.id, e.target.value ? `${e.target.value}T09:00` : '')}
                    className="h-8 text-xs"
                  />
                </div>
              </PopoverContent>
            </Popover>

            {/* Reassign */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 text-[10px] text-muted-foreground px-1.5 py-0.5 rounded hover:bg-muted transition-colors">
                  <Users className="w-3 h-3" />
                  {task.assigned_to ? 'Assigned' : 'Assign'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 z-[100]" align="start">
                <Label className="text-[10px] text-muted-foreground mb-1 block">Assign to</Label>
                <AssigneePicker
                  value={task.assigned_to ?? null}
                  onChange={(uid) => reassignTask(task.id, uid)}
                  size="sm"
                />
              </PopoverContent>
            </Popover>

            {/* Add note */}
            <Popover open={heroNoteFor === task.id} onOpenChange={(o) => { setHeroNoteFor(o ? task.id : null); if (!o) setHeroNoteText(''); }}>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 text-[10px] text-muted-foreground px-1.5 py-0.5 rounded hover:bg-muted transition-colors">
                  <MessageSquare className="w-3 h-3" />
                  {taskNotes.length > 0 ? taskNotes.length : 'Note'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 z-[100]" align="start">
                <Label className="text-[10px] text-muted-foreground mb-1 block">Add a note</Label>
                <Textarea
                  value={heroNoteText}
                  onChange={(e) => setHeroNoteText(e.target.value)}
                  placeholder="Quick note…"
                  className="text-xs min-h-[60px]"
                />
                <div className="flex justify-end gap-1 mt-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setHeroNoteFor(null); setHeroNoteText(''); }}>Cancel</Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={!heroNoteText.trim()}
                    onClick={async () => {
                      const text = heroNoteText.trim();
                      if (!text) return;
                      const content = `📋 [Task: ${task.title}] ${text}`;
                      await addNote(content, 'note', task.id);
                      setHeroNoteText('');
                      setHeroNoteFor(null);
                    }}
                  >Save</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    );
  };

  const renderHeroTaskRow = (task: Task, tone: 'destructive' | 'success' | 'muted') => {
    const taskNotes = getTaskNotes(task.id);
    const due = task.due_date ? new Date(task.due_date) : null;
    const assignee = task.assigned_to ? teamMembers.find(m => m.user_id === task.assigned_to) : null;
    const initials = assignee?.name
      ? assignee.name.split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
      : null;
    return (
      <div
        key={task.id}
        className={cn(
          "group rounded-lg border pl-3 pr-2 py-2 flex items-center gap-3 hover:shadow-sm transition-all",
          tone === 'destructive' && 'bg-destructive/10 border-destructive/30',
          tone === 'success' && 'bg-success/10 border-success/30',
          tone === 'muted' && 'bg-muted border-border',
        )}
      >
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => toggleTaskComplete(task)}
        />
        <div
          title={assignee?.name ? `Assigned to ${assignee.name}` : 'Unassigned'}
          className={cn(
            "shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border",
            initials ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-dashed border-border'
          )}
        >
          {initials || '?'}
        </div>
        <button
          type="button"
          onClick={() => { setExpandedTaskId(task.id); setOpenHeroTaskId(task.id); }}
          className="flex-1 min-w-0 text-left text-sm font-medium leading-snug truncate hover:underline"
        >
          {task.title}
        </button>

        {/* Inline actions */}
        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          <Popover>
            <PopoverTrigger asChild>
              <button title="Reassign" className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-muted text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 z-[100]" align="end">
              <Label className="text-[10px] text-muted-foreground mb-1 block">Assign to</Label>
              <AssigneePicker value={task.assigned_to ?? null} onChange={(uid) => reassignTask(task.id, uid)} size="sm" />
            </PopoverContent>
          </Popover>

          <Popover open={heroNoteFor === task.id} onOpenChange={(o) => { setHeroNoteFor(o ? task.id : null); if (!o) setHeroNoteText(''); }}>
            <PopoverTrigger asChild>
              <button title="Add note" className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-muted text-muted-foreground relative">
                <MessageSquare className="w-3.5 h-3.5" />
                {taskNotes.length > 0 && <span className="absolute -top-0.5 -right-0.5 text-[9px] bg-primary text-primary-foreground rounded-full px-1 leading-tight">{taskNotes.length}</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 z-[100]" align="end">
              <Label className="text-[10px] text-muted-foreground mb-1 block">Add a note</Label>
              <Textarea value={heroNoteText} onChange={(e) => setHeroNoteText(e.target.value)} placeholder="Quick note…" className="text-xs min-h-[60px]" />
              <div className="flex justify-end gap-1 mt-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setHeroNoteFor(null); setHeroNoteText(''); }}>Cancel</Button>
                <Button size="sm" className="h-7 text-xs" disabled={!heroNoteText.trim()} onClick={async () => {
                  const text = heroNoteText.trim();
                  await addNote(`📋 [Task: ${task.title}] ${text}`, 'note', task.id);
                  setHeroNoteFor(null); setHeroNoteText('');
                }}>Save</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Date badge — calendar style */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              title={due ? format(due, 'EEEE, dd MMM yyyy') : 'Set due date'}
              className={cn(
                "shrink-0 w-14 rounded-md border text-center overflow-hidden hover:ring-2 hover:ring-offset-1 transition-all",
                tone === 'destructive' && 'border-destructive/40 hover:ring-destructive/30',
                tone === 'success' && 'border-success/40 hover:ring-success/30',
                tone === 'muted' && 'border-border hover:ring-border',
              )}
            >
              <div className={cn(
                "text-[9px] font-semibold uppercase tracking-wider py-0.5",
                tone === 'destructive' && 'bg-destructive/10 text-destructive',
                tone === 'success' && 'bg-success/10 text-success',
                tone === 'muted' && 'bg-muted text-muted-foreground',
              )}>
                {due ? format(due, 'MMM') : '—'}
              </div>
              <div className={cn(
                "text-base font-bold leading-tight py-0.5",
                tone === 'destructive' && 'text-destructive',
                tone === 'success' && 'text-success',
                tone === 'muted' && 'text-foreground',
              )}>
                {due ? format(due, 'dd') : '–'}
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 z-[100]" align="end">
            <Label className="text-[10px] text-muted-foreground">Reschedule</Label>
            <Input
              type="date"
              defaultValue={due ? format(due, 'yyyy-MM-dd') : ''}
              onBlur={(e) => rescheduleTask(task.id, e.target.value ? `${e.target.value}T09:00` : '')}
              className="h-8 text-xs mt-1"
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  const renderTaskItem = (task: Task) => {
    const isOverdue = !task.completed && task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
    const isDueToday = !task.completed && task.due_date && isToday(new Date(task.due_date));
    const isExpanded = expandedTaskId === task.id;
    const isEditing = editingTask?.id === task.id;
    const taskNotes = getTaskNotes(task.id);
    const checklist = task.checklist_items || [];
    const checklistDone = checklist.filter(c => c.done).length;

    const openTask = () => {
      if (isExpanded) {
        setExpandedTaskId(null);
        setEditingTask(null);
      } else {
        setExpandedTaskId(task.id);
        setEditingTask({
          id: task.id,
          title: task.title,
          dueDate: task.due_date ? formatDatetimeLocal(new Date(task.due_date)) : '',
        });
      }
    };

    return (
      <div key={task.id} className={`rounded-lg border transition-all ${isOverdue ? 'border-destructive/30 bg-destructive/5' : task.completed ? 'opacity-60' : 'bg-background'}`}>
        {/* Header row — always shown */}
        <div className="flex items-start gap-2 p-2.5">
            <Checkbox checked={task.completed} onCheckedChange={() => toggleTaskComplete(task)} className="mt-0.5" />
            <div className="flex-1 min-w-0 cursor-pointer" onClick={openTask}>
              <p className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {task.due_date && (
                  <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-destructive' : isDueToday ? 'text-success' : 'text-muted-foreground'}`}>
                    <Calendar className="w-3 h-3" />
                    {isOverdue ? 'Overdue — ' : isDueToday ? 'Today — ' : ''}
                    {format(new Date(task.due_date), 'dd MMM')}
                  </span>
                )}
                {taskNotes.length > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <MessageSquare className="w-3 h-3" /> {taskNotes.length}
                  </span>
                )}
                {checklist.length > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <CheckCircle className="w-3 h-3" /> {checklistDone}/{checklist.length}
                  </span>
                )}
                {isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              </div>
            </div>
        </div>

        {/* Expanded: edit form + notes */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-0 border-t mx-2.5 mt-0">
            <div className="pt-3 space-y-3" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
              {!task.completed && editingTask && (
                <div className="space-y-2.5">
                  <div>
                    <Label className="text-xs text-muted-foreground">Task Title</Label>
                    <Input
                      value={editingTask.title}
                      onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                      className="h-9 text-sm mt-1"
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
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 text-xs px-4 flex-1" onClick={() => updateTask(task.id)} disabled={!editingTask.title.trim()}>
                      <Save className="w-3.5 h-3.5 mr-1.5" /> Save Changes
                    </Button>
                  </div>
                </div>
              )}

              {checklist.length > 0 && (
                <div className="space-y-1">
                  {checklist.map((item, idx) => (
                    <label key={idx} className="flex items-start gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={item.done}
                        onCheckedChange={() => toggleChecklistItem(task.id, idx)}
                        className="mt-0.5"
                      />
                      <span className={item.done ? 'line-through text-muted-foreground' : ''}>{item.text}</span>
                    </label>
                  ))}
                </div>
              )}
              {taskNotes.length > 0 && (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {taskNotes.map(n => (
                    <div key={n.id} className="bg-muted/50 rounded-md p-3 text-sm">
                      <p className="whitespace-pre-wrap leading-relaxed">{n.content.replace(/^📋 \[Task: .*?\] /, '')}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">{format(new Date(n.created_at), 'dd MMM, HH:mm')}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea
                  placeholder="Add a note to this task..."
                  value={taskNoteText}
                  onChange={e => setTaskNoteText(e.target.value)}
                  rows={5}
                  className="text-sm resize-y min-h-[120px]"
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addTaskNote(task.id); }}
                />
                <div className="flex justify-end">
                  <Button size="sm" disabled={!taskNoteText.trim()} onClick={() => addTaskNote(task.id)}>
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Add note
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                <Button
                  variant={task.completed ? 'outline' : 'default'}
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={() => toggleTaskComplete(task)}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {task.completed ? 'Reopen task' : 'Mark complete'}
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive hover:text-destructive px-2" onClick={() => deleteTask(task.id)}>
                  <Trash2 className="w-3 h-3 mr-1" /> Delete task
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const primaryApplicantContact = lead.source_contact_id
    ? contactsList.find(c => c.id === lead.source_contact_id)
    : contactsList.find(c => {
      const sameEmail = lead.email && c.email?.toLowerCase() === lead.email.toLowerCase();
      const samePhone = lead.phone && c.phone === lead.phone;
      const sameName = c.first_name.toLowerCase() === lead.first_name.toLowerCase() && c.last_name.toLowerCase() === lead.last_name.toLowerCase();
      return sameEmail || samePhone || sameName;
    });

  const coApplicantContact = lead.co_applicant_contact_id
    ? mergedContactsList.find(c => c.id === lead.co_applicant_contact_id) ?? null
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto p-0">
        {/* Contact Header Card */}
        <div className="bg-muted/30 p-6 pb-4 border-b">
          <SheetHeader className="mb-4">
            <SheetTitle asChild>
              <div className="min-w-0">
                <Input
                  value={lead.opportunity_name ?? ''}
                  placeholder={`e.g. ${lead.last_name || 'Surname'}, ${lead.first_name || 'Name'} - ${LOAN_PURPOSE_OPTIONS.find(o => o.value === lead.loan_purpose)?.label || 'Opportunity'}`}
                  className="h-10 text-xl font-bold border-0 px-0 mb-2 focus-visible:ring-0 placeholder:text-muted-foreground/60 placeholder:font-normal text-foreground shadow-none"
                  onChange={(e) => onLeadChange?.({ ...lead, opportunity_name: e.target.value })}
                  onBlur={async (e) => {
                    const v = e.target.value.trim() || null;
                    await supabase.from('leads').update({ opportunity_name: v } as any).eq('id', lead.id);
                  }}
                />
                {lead.loan_purpose && (
                  <p className="text-sm font-normal text-muted-foreground">{LOAN_PURPOSE_OPTIONS.find(o => o.value === lead.loan_purpose)?.label || lead.loan_purpose}</p>
                )}
                <div className="mt-1.5">
                  {lead.wip_status ? (() => {
                    const w = WIP_STATUSES.find(s => s.name === lead.wip_status);
                    return (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: w?.color || '#64748b' }}
                      >
                        {w?.label || lead.wip_status}
                      </span>
                    );
                  })() : (
                    <StatusBadge status={lead.status} statuses={statuses} />
                  )}
                </div>
                {lead.source_contact_id && sourceContactReferralCount !== null && sourceContactReferralCount > 0 && (
                  <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                        {sourceContactReferralCount} referral{sourceContactReferralCount !== 1 ? 's' : ''}
                      </span>
                  </div>
                )}
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="mb-3 flex items-end gap-3">
            {!isPreviewMode && lead.broker_id === user?.id && (
              <div className="shrink-0">
                <ReferLeadDialog
                  leadId={lead.id}
                  leadName={`${lead.first_name} ${lead.last_name}`}
                />
              </div>
            )}
            {!isPreviewMode && lead.email && (
              <div className="shrink-0">
                <SendMilestoneEmailDialog lead={lead as any} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Lead Source</Label>
              <Select
                value={lead.source ?? ''}
                onValueChange={async (val) => {
                  if (val === '__add_new__') { setAddingSource(true); return; }
                  const source = val || null;
                  onLeadChange?.({ ...lead, source });
                  if (!isPreviewMode) {
                    await supabase.from('leads').update({ source } as any).eq('id', lead.id);
                  }
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {leadSources.map(s => (
                    <SelectItem key={s.name} value={s.name}>{s.label}</SelectItem>
                  ))}
                  <SelectItem value="__add_new__" className="text-primary font-medium">+ Add new source…</SelectItem>
                </SelectContent>
              </Select>
              {addingSource && (
                <div className="mt-2 flex gap-1.5">
                  <Input
                    autoFocus
                    value={newSourceLabel}
                    onChange={(e) => setNewSourceLabel(e.target.value)}
                    placeholder="New source name"
                    className="h-8 text-sm"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddSource(); if (e.key === 'Escape') { setAddingSource(false); setNewSourceLabel(''); } }}
                  />
                  <Button size="sm" className="h-8" onClick={handleAddSource}>Add</Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => { setAddingSource(false); setNewSourceLabel(''); }}>Cancel</Button>
                </div>
              )}
            </div>
          </div>

          {/* Tasks Hero — focal point for daily action */}
          {/* Referral Partner — moved above Applicants */}
          <div id="sec-referrals" className="scroll-mt-16 mb-3 rounded-lg border border-border bg-muted/20 overflow-hidden">
            <div className="px-3 py-2 bg-muted/40 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Referral Partner</span>
              </div>
            </div>
            <div className="p-3">
              {lead.referral_partner_id && referrerName && (
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {referrerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{referrerName}</p>
                    {referrerCompany && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {referrerCompany}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" title="Remove partner"
                    onClick={async () => {
                      onLeadChange?.({ ...lead, referral_partner_id: null });
                      if (!isPreviewMode) {
                        await supabase.from('leads').update({ referral_partner_id: null } as any).eq('id', lead.id);
                      }
                      toast.success('Referral partner removed');
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              {lead.referral_partner_id && !referrerName && (
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs shrink-0">?</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground italic">Unknown partner</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" title="Remove partner"
                    onClick={async () => {
                      onLeadChange?.({ ...lead, referral_partner_id: null });
                      if (!isPreviewMode) {
                        await supabase.from('leads').update({ referral_partner_id: null } as any).eq('id', lead.id);
                      }
                      toast.success('Referral partner removed');
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              <Popover open={partnerPickerOpen} onOpenChange={setPartnerPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground font-normal h-9">
                    <Search className="w-4 h-4 shrink-0" />
                    <span>{lead.referral_partner_id ? 'Change referral partner...' : 'Search for referral partner...'}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0 bg-background border border-border shadow-lg z-[100]" align="start">
                  <Command>
                    <CommandInput placeholder="Type a name to search..." />
                    <CommandList>
                      <CommandEmpty>No partners found.</CommandEmpty>
                      <CommandGroup>
                        {referrersList.map(r => (
                          <CommandItem
                            key={r.id}
                            value={`${r.full_name || ''} ${r.email || ''} ${r.company_name || ''}`}
                            onSelect={async () => {
                              setPartnerPickerOpen(false);
                              const partnerId = r.user_id || r.id;
                              onLeadChange?.({ ...lead, referral_partner_id: partnerId });
                              if (!isPreviewMode) {
                                await supabase.from('leads').update({ referral_partner_id: partnerId } as any).eq('id', lead.id);
                              }
                              toast.success(`Linked to ${r.full_name || 'partner'}`);
                            }}
                            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {(r.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{r.full_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {r.company_name || r.email || r.phone || 'No details'}
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {sourceContactName && !referrerName && (
            <div className="mb-3 bg-primary/5 rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Referred by client <strong>{sourceContactName}</strong></span>
            </div>
          )}

          {/* Applicants — primary + co-applicant side-by-side (moved above tasks) */}
          <div id="sec-overview" className="scroll-mt-16 grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm font-medium truncate">{lead.first_name} {lead.last_name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {(primaryApplicantContact?.email || lead.email) && (
                      <a href={`mailto:${primaryApplicantContact?.email || lead.email}`} className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 shrink-0" /> {primaryApplicantContact?.email || lead.email}
                      </a>
                    )}
                    {(primaryApplicantContact?.phone || lead.phone) && (
                      <a href={`tel:${primaryApplicantContact?.phone || lead.phone}`} className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
                        <Phone className="w-3 h-3 shrink-0" /> {primaryApplicantContact?.phone || lead.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-2 border-t border-border">
                {primaryApplicantContact && onOpenContact && (
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs h-8" onClick={() => onOpenContact(primaryApplicantContact.id)}>
                    <ExternalLink className="w-3 h-3" /> Open
                  </Button>
                )}
              </div>
            </div>
            <CoApplicantPicker
              contacts={mergedContactsList}
              value={lead.co_applicant_contact_id ?? null}
              excludeIds={[
                lead.source_contact_id,
                lead.co_applicant_contact_id_2,
                lead.co_applicant_contact_id_3,
              ].filter(Boolean) as string[]}
              isPreviewMode={isPreviewMode}
              onOpenContact={onOpenContact}
              hideHeader
              onChange={async (newId, newContact) => {
                if (newContact) setExtraContacts(prev => [...prev.filter(c => c.id !== newContact.id), newContact]);
                onLeadChange?.({ ...lead, co_applicant_contact_id: newId });
                if (!isPreviewMode) {
                  await supabase.from('leads').update({ co_applicant_contact_id: newId } as any).eq('id', lead.id);
                }
              }}
            />
            {lead.co_applicant_contact_id && (
            <CoApplicantPicker
              contacts={mergedContactsList}
              value={lead.co_applicant_contact_id_2 ?? null}
              excludeIds={[
                lead.source_contact_id,
                lead.co_applicant_contact_id,
                lead.co_applicant_contact_id_3,
              ].filter(Boolean) as string[]}
              isPreviewMode={isPreviewMode}
              onOpenContact={onOpenContact}
              hideHeader
              onChange={async (newId, newContact) => {
                if (newContact) setExtraContacts(prev => [...prev.filter(c => c.id !== newContact.id), newContact]);
                onLeadChange?.({ ...lead, co_applicant_contact_id_2: newId });
                if (!isPreviewMode) {
                  await supabase.from('leads').update({ co_applicant_contact_id_2: newId } as any).eq('id', lead.id);
                }
              }}
            />)}
            {lead.co_applicant_contact_id_2 && (
            <CoApplicantPicker
              contacts={mergedContactsList}
              value={lead.co_applicant_contact_id_3 ?? null}
              excludeIds={[
                lead.source_contact_id,
                lead.co_applicant_contact_id,
                lead.co_applicant_contact_id_2,
              ].filter(Boolean) as string[]}
              isPreviewMode={isPreviewMode}
              onOpenContact={onOpenContact}
              hideHeader
              onChange={async (newId, newContact) => {
                if (newContact) setExtraContacts(prev => [...prev.filter(c => c.id !== newContact.id), newContact]);
                onLeadChange?.({ ...lead, co_applicant_contact_id_3: newId });
                if (!isPreviewMode) {
                  await supabase.from('leads').update({ co_applicant_contact_id_3: newId } as any).eq('id', lead.id);
                }
              }}
            />)}
          </div>

          {/* Expand / Collapse all sections */}
          <div className="flex justify-end mb-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 gap-1 text-xs"
              onClick={() => {
                const expand = heroCollapsed || true;
                // Toggle: if hero is collapsed OR any section is likely collapsed, expand all; otherwise collapse all
                const shouldExpand = !expandAllOn;
                setExpandAllOn(shouldExpand);
                setHeroCollapsed(!shouldExpand);
                window.dispatchEvent(new CustomEvent('section-card:toggle-all', { detail: { expand: shouldExpand } }));
              }}
            >
              {expandAllOn ? 'Collapse all' : 'Expand all'}
            </Button>
          </div>

          <div className="mb-4 rounded-xl border-2 border-success/30 bg-gradient-to-br from-success/10 via-background to-background shadow-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-success/10 border-b border-success/20">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-md bg-success text-success-foreground flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground leading-tight">Tasks</h3>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {pendingTasks.length} open
                    {overdueTasks.length > 0 && <span className="text-destructive font-medium"> · {overdueTasks.length} overdue</span>}
                    {todayColTasks.length > 0 && <span className="text-success font-medium"> · {todayColTasks.length} today</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => { setShowTaskForm(s => !s); setHeroCollapsed(false); }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add task
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 gap-1 text-xs"
                  onClick={() => setHeroCollapsed(c => !c)}
                  title={heroCollapsed ? 'Expand' : 'Collapse'}
                >
                  {heroCollapsed ? 'Expand' : 'Collapse'}
                  {heroCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 rotate-90" />}
                </Button>
              </div>
            </div>

            {!heroCollapsed && (
              <div className="p-3 space-y-3">
                {taskTemplates.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-muted-foreground">Apply template:</span>
                    <Select onValueChange={(v) => applyTaskTemplate(v)}>
                      <SelectTrigger className="h-7 text-xs w-auto min-w-[180px]">
                        <SelectValue placeholder="Choose template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {taskTemplates.map(tpl => (
                          <SelectItem key={tpl.id} value={tpl.id} className="text-xs">{tpl.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {showTaskForm && (
                  <div className="bg-background border border-border rounded-lg p-4 space-y-4 shadow-sm">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Task title</Label>
                      <Input
                        placeholder="Enter a task title"
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        className="h-11 text-base font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <div className="rounded-md border bg-background">
                        <div className="flex items-center gap-0.5 px-1.5 py-1 border-b bg-muted/40">
                          {(() => {
                            const ta = () => taskDescTextareaRef.current;
                            const apply = (fn: (val: string, start: number, end: number) => { value: string; cursor: number }) => {
                              const el = ta(); if (!el) return;
                              const { value, cursor } = fn(el.value, el.selectionStart ?? 0, el.selectionEnd ?? 0);
                              setNewTaskDescription(value);
                              requestAnimationFrame(() => { el.focus(); el.setSelectionRange(cursor, cursor); });
                            };
                            const wrap = (left: string, right = left) => apply((v, s, e) => {
                              const sel = v.slice(s, e) || 'text';
                              const next = v.slice(0, s) + left + sel + right + v.slice(e);
                              return { value: next, cursor: s + left.length + sel.length + right.length };
                            });
                            const linePrefix = (prefix: string | ((i: number) => string)) => apply((v, s, e) => {
                              const lineStart = v.lastIndexOf('\n', s - 1) + 1;
                              const lineEnd = v.indexOf('\n', e); const end = lineEnd === -1 ? v.length : lineEnd;
                              const block = v.slice(lineStart, end);
                              const lines = block.split('\n').map((ln, i) => (typeof prefix === 'string' ? prefix : prefix(i)) + ln);
                              const next = v.slice(0, lineStart) + lines.join('\n') + v.slice(end);
                              return { value: next, cursor: next.length - (v.length - end) };
                            });
                            const Btn = ({ onClick, title, children }: any) => (
                              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title={title} onClick={onClick}>{children}</Button>
                            );
                            return (
                              <>
                                <Btn title="Bold" onClick={() => wrap('**')}><Bold className="w-3.5 h-3.5" /></Btn>
                                <Btn title="Italic" onClick={() => wrap('_')}><Italic className="w-3.5 h-3.5" /></Btn>
                                <div className="w-px h-4 bg-border mx-1" />
                                <Btn title="Bullet list" onClick={() => linePrefix('• ')}><List className="w-3.5 h-3.5" /></Btn>
                                <Btn title="Numbered list" onClick={() => linePrefix((i) => `${i + 1}. `)}><ListOrdered className="w-3.5 h-3.5" /></Btn>
                                <Btn title="To-do list" onClick={() => linePrefix('[ ] ')}><ListChecks className="w-3.5 h-3.5" /></Btn>
                              </>
                            );
                          })()}
                        </div>
                        <Textarea
                          ref={taskDescTextareaRef}
                          placeholder="Add details, context, or instructions..."
                          value={newTaskDescription}
                          onChange={e => setNewTaskDescription(e.target.value)}
                          rows={6}
                          className="text-sm resize-y min-h-[140px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1.5">Quick follow-up</p>
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
                    <div className="flex items-center gap-2 pt-1 border-t">
                      <div className="flex-1">
                        <Label className="text-[11px] text-muted-foreground">Due date</Label>
                        <Input
                          type="date"
                          value={newTaskDueDate ? newTaskDueDate.slice(0, 10) : ''}
                          onChange={e => setNewTaskDueDate(e.target.value ? `${e.target.value}T09:00` : '')}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-[11px] text-muted-foreground">Assign to</Label>
                        <AssigneePicker value={newTaskAssignee} onChange={setNewTaskAssignee} size="sm" />
                      </div>
                      <div className="flex gap-2 self-end">
                        <Button variant="ghost" size="sm" onClick={() => { setShowTaskForm(false); setNewTaskTitle(''); setNewTaskDueDate(''); setNewTaskDescription(''); setNewTaskAssignee(null); }}>Cancel</Button>
                        <Button size="sm" onClick={createTask} disabled={!newTaskTitle.trim()}>Create task</Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {(() => {
                    const all = [
                      ...overdueColTasks.map(t => ({ t, tone: 'destructive' as const })),
                      ...todayColTasks.map(t => ({ t, tone: 'success' as const })),
                      ...upcomingColTasks.map(t => ({ t, tone: 'muted' as const })),
                    ];
                    if (all.length === 0) {
                      return <p className="text-xs text-muted-foreground text-center py-6">No open tasks</p>;
                    }
                    return all.map(({ t, tone }) => renderHeroTaskRow(t, tone));
                  })()}
                </div>

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
            )}
          </div>

          {/* Timeline — moved directly under Tasks */}
          <div id="sec-tabs" className="scroll-mt-16" />
          <div id="sec-activity" className="scroll-mt-16" />
          <SectionCard
            icon={Activity}
            title="Timeline"
            tone="neutral"
            subtitle={notes.length > 0 ? `${notes.length} ${notes.length === 1 ? 'entry' : 'entries'}` : 'No activity yet'}
          >
            <div className="space-y-2">
              {/* Add note form */}
              <div className="space-y-2">
                <Textarea
                  ref={noteTextareaRef}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Log a note, call summary, or update..."
                  rows={6}
                  maxLength={2000}
                  className="min-h-[180px] text-sm resize-y"
                />
                {noteFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {noteFiles.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                        <FileText className="w-3 h-3" />
                        <span className="max-w-[160px] truncate">{f.name}</span>
                        <button onClick={() => setNoteFiles(prev => prev.filter((_, j) => j !== i))} className="hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox id="notify-detail" checked={notifyPartner} onCheckedChange={(v) => setNotifyPartner(v === true)} />
                    <Label htmlFor="notify-detail" className="text-xs cursor-pointer">Notify partner</Label>
                    <input
                      ref={noteFileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const valid = files.filter(f => f.size <= 25 * 1024 * 1024);
                        if (valid.length < files.length) toast.error('Some files exceeded 25MB and were skipped');
                        setNoteFiles(prev => [...prev, ...valid]);
                        if (noteFileInputRef.current) noteFileInputRef.current.value = '';
                      }}
                    />
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={() => noteFileInputRef.current?.click()}>
                      <Paperclip className="w-3.5 h-3.5" /> Attach
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 gap-1"
                      onClick={async () => {
                        if (isPreviewMode) { toast.info('Preview mode — not imported'); return; }
                        const url = window.prompt('Paste the Google Doc URL (must be shared with the connected Google account):');
                        if (!url) return;
                        const t = toast.loading('Importing Google Doc…');
                        const { data, error } = await supabase.functions.invoke('import-google-doc', {
                          body: { lead_id: lead.id, url, label: 'Meeting summary' },
                        });
                        toast.dismiss(t);
                        if (error || (data as any)?.error) {
                          toast.error((data as any)?.error || error?.message || 'Import failed');
                          return;
                        }
                        toast.success(`Imported "${(data as any)?.title || 'doc'}"`);
                        fetchNotes(lead.id);
                      }}
                      title="Import a Google Doc into the timeline"
                    >
                      <FileDown className="w-3.5 h-3.5" /> Import Google Doc
                    </Button>
                  </div>
                  <Button onClick={() => addNote(newNote)} disabled={!newNote.trim()} size="sm" className="gap-1.5">
                    <Send className="w-3.5 h-3.5" /> Log
                  </Button>
                </div>
              </div>

              {/* Activity timeline */}
              <ScrollArea className="h-[480px]">
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
                ) : (
                  <div className="relative pl-6 space-y-0">
                    <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                    {notes.map((note) => {
                      const isEmail = note.content.startsWith('📧');
                      const isCall = note.content.startsWith('📞');
                      const isTaskNote = note.content.startsWith('📋');
                      const isDocReq = note.content.startsWith('📄');
                      const isMir = note.content.startsWith('📨');
                      const isFinance = note.content.startsWith('💰');
                      const isContact = note.content.startsWith('👤');
                      const isStatus = note.content.startsWith('🔄');
                      const isSystem = note.content.startsWith('⚙️');
                      return (
                        <div key={note.id} className="relative pb-3">
                          <div className={`absolute -left-[14px] top-1.5 w-3 h-3 rounded-full border-2 border-background ${
                            isMir ? 'bg-orange-500' : isEmail ? 'bg-blue-500' : isCall ? 'bg-green-500' : isTaskNote ? 'bg-amber-500' : isDocReq ? 'bg-purple-500' : isFinance ? 'bg-rose-500' : isContact ? 'bg-indigo-500' : isStatus ? 'bg-cyan-500' : isSystem ? 'bg-slate-500' : 'bg-muted-foreground/40'
                          }`} />
                          <div className={`rounded-lg p-2.5 ${isMir ? 'bg-orange-50 border border-orange-200' : 'bg-muted/50'}`}>
                            {isMir && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-semibold uppercase tracking-wide mb-1">
                                MIR
                              </span>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                            {note.attachments && note.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {note.attachments.map(att => (
                                  <button
                                    key={att.id}
                                    onClick={() => downloadAttachment(att)}
                                    className="inline-flex items-center gap-1 text-xs bg-background border rounded px-2 py-1 hover:bg-muted"
                                    title={att.file_name}
                                  >
                                    <Download className="w-3 h-3" />
                                    <span className="max-w-[180px] truncate">{att.file_name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
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
          </SectionCard>

          {/* Professional Contacts (solicitor / conveyancer / accountant) */}
          <div className="mb-3">
            <ProfessionalContactsSection
              leadId={lead.id}
              contacts={mergedContactsList as any}
              isPreviewMode={isPreviewMode}
              onOpenContact={onOpenContact}
              onContactCreated={(c) => setExtraContacts(prev => [...prev, c])}
            />
          </div>

          {/* Subject to Finance — highlighted */}
          <SubjectToFinanceSection
            leadId={lead.id}
            subjectToFinance={!!lead.subject_to_finance}
            financeDueDate={lead.finance_due_date ?? null}
            contacts={contactsList as any}
            isPreviewMode={isPreviewMode}
            onChange={(updates) => onLeadChange?.({ ...lead, ...updates })}
          />

          {/* Pre-Approval — only for Pre Approval transaction type */}
          {lead.loan_purpose === 'pre_approval' && (
            <PreApprovalSection
              leadId={lead.id}
              purchasePrice={lead.pre_approval_purchase_price ?? null}
              loanAmount={lead.pre_approval_loan_amount ?? null}
              expiryDate={lead.pre_approval_expiry_date ?? null}
              ftc={lead.pre_approval_ftc ?? null}
              isPreviewMode={isPreviewMode}
              onChange={(updates) => onLeadChange?.({ ...lead, ...updates })}
            />
          )}

          {/* Deal Setup — moved above Loan Splits, directly below Tasks */}
          <div id="sec-status" className="scroll-mt-16" />
          <SectionCard
            icon={SettingsIcon}
            title="Deal Setup"
            tone="neutral"
            subtitle={<>
              {(statuses.find(s => s.name === lead.status)?.label || lead.status)}
              {lead.loan_purpose && <> · {LOAN_PURPOSE_OPTIONS.find(o => o.value === lead.loan_purpose)?.label || lead.loan_purpose}</>}
              {lead.loan_amount ? <> · ${lead.loan_amount.toLocaleString()}</> : null}
            </>}
          >
          <div className="space-y-5">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Status</Label>
              <Select
                value={lead.wip_status ? `wip:${lead.wip_status}` : `lead:${lead.status}`}
                onValueChange={(v) => {
                  const prev = lead.wip_status ? `WIP · ${lead.wip_status}` : (statuses.find(s => s.name === lead.status)?.label || lead.status);
                  if (v.startsWith('wip:')) {
                    const next = v.slice(4);
                    onUpdateWipStatus?.(lead.id, next);
                    const nextLabel = WIP_STATUSES.find(s => s.name === next)?.label || next;
                    import('@/lib/leadAudit').then(m => m.logAudit(lead.id, `🔄 Status changed: ${prev} → WIP · ${nextLabel}`, { isPreview: isPreviewMode }));
                  } else {
                    const next = v.slice(5);
                    onUpdateStatus(lead.id, next);
                    if (lead.wip_status) onUpdateWipStatus?.(lead.id, null);
                    const nextLabel = statuses.find(s => s.name === next)?.label || next;
                    import('@/lib/leadAudit').then(m => m.logAudit(lead.id, `🔄 Status changed: ${prev} → ${nextLabel}`, { isPreview: isPreviewMode }));
                  }
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">Lead Status</div>
                  {statuses.map(s => (
                    <SelectItem key={`lead-${s.name}`} value={`lead:${s.name}`}>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1 mt-1 text-[10px] font-semibold uppercase text-muted-foreground border-t">WIP Stage</div>
                  {WIP_STATUSES.map(s => (
                    <SelectItem key={`wip-${s.name}`} value={`wip:${s.name}`}>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
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

          {isSuperAdmin && brokerOptions.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Assigned Broker</Label>
              <Select
                value={lead.broker_id ?? ''}
                onValueChange={async (val) => {
                  const newBrokerId = val || null;
                  onLeadChange?.({ ...lead, broker_id: newBrokerId });
                  if (!isPreviewMode) {
                    const { error } = await supabase.from('leads').update({ broker_id: newBrokerId } as any).eq('id', lead.id);
                    if (error) { toast.error('Failed to reassign lead'); return; }
                  }
                  const brokerName = brokerOptions.find(b => b.id === val)?.name || 'Unknown';
                  toast.success(`Lead reassigned to ${brokerName}`);
                  addNote(`🔄 Lead reassigned to ${brokerName}`, 'note');
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select broker" /></SelectTrigger>
                <SelectContent>
                  {brokerOptions.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}{b.email ? ` (${b.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Assistant</Label>
            <AssigneePicker
              value={(lead as any).assigned_to ?? null}
              onChange={async (userId) => {
                onLeadChange?.({ ...lead, assigned_to: userId } as any);
                if (!isPreviewMode) {
                  const { error } = await supabase.from('leads').update({ assigned_to: userId } as any).eq('id', lead.id);
                  if (error) { toast.error('Failed to update assistant'); return; }
                }
                toast.success(userId ? 'Assistant updated' : 'Assistant cleared');
                import('@/lib/leadAudit').then(m => m.logAudit(lead.id, userId ? `🔄 Assistant assigned` : `🔄 Assistant cleared`, { isPreview: isPreviewMode }));
              }}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Allocate this file to a specific assistant or team member.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Loan Amount (Total)</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  inputMode="numeric"
                  className="pl-8 bg-muted/30"
                  placeholder="Auto-summed from splits"
                  readOnly
                  value={lead.loan_amount ? lead.loan_amount.toLocaleString() : ''}
                  onChange={() => { /* auto-summed from splits */ }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Sum of all loan splits below.</p>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Transaction</Label>
              <Select
                value={lead.loan_purpose ?? ''}
                onValueChange={async (val) => {
                  const purpose = val || null;
                  const prev = lead.loan_purpose || 'none';
                  onLeadChange?.({ ...lead, loan_purpose: purpose });
                  if (!isPreviewMode) {
                    await supabase.from('leads').update({ loan_purpose: purpose } as any).eq('id', lead.id);
                  }
                  import('@/lib/leadAudit').then(m => m.logAudit(lead.id, `⚙️ Transaction type changed: ${prev} → ${purpose || 'none'}`, { isPreview: isPreviewMode }));
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select transaction" /></SelectTrigger>
                <SelectContent>
                  {LOAN_PURPOSE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          </div>
          </SectionCard>

          {/* Loan Splits — moved to sit directly under Tasks */}
          <LoanSplitsEditor
            leadId={lead.id}
            isPreviewMode={isPreviewMode}
            settled={lead.status === 'settled' || !!(lead as any).settled_date}
            settledDate={(lead as any).settled_date ?? null}
            onSettlementStateChange={(isSettled, settledDate) => {
              onLeadChange?.({ ...lead, status: isSettled ? 'settled' : 'approved', settled_date: settledDate } as any);
            }}
            onTotalChange={async (total) => {
              const val = total > 0 ? total : null;
              if (val !== lead.loan_amount) {
                onLeadChange?.({ ...lead, loan_amount: val });
                if (!isPreviewMode) {
                  await supabase.from('leads').update({ loan_amount: val } as any).eq('id', lead.id);
                }
              }
            }}
          />

          {/* Deal Milestones — collapsible, mirrors Loan Splits styling */}
          {(() => {
            const milestones = [
              { key: 'lodged_date' as const, label: 'Lodged' },
              { key: 'approved_date' as const, label: 'Approved' },
              { key: 'settled_date' as const, label: 'Settled' },
            ];
            const setCount = milestones.filter(m => (lead as any)[m.key]).length;
            const est = (lead as any).estimated_settlement_date;
            const subtitle = setCount === 0 && !est
              ? 'No milestones set yet'
              : <>{setCount} of {milestones.length} milestones set{est && !((lead as any).settled_date) ? <> · Est. settlement {format(new Date(est), 'dd MMM yyyy')}</> : null}</>;
            return (
              <SectionCard
                icon={Flag}
                title="Deal Milestones"
                tone={setCount === milestones.length ? 'success' : setCount > 0 ? 'ok' : 'neutral'}
                subtitle={subtitle}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {milestones.map(({ key, label }) => (
                    <div key={key}>
                      <Label className="text-[11px] text-muted-foreground">{label}</Label>
                      <Input
                        type="date"
                        value={(lead as any)[key] ?? ''}
                        onChange={async (e) => {
                          const val = e.target.value || null;
                          const prev = (lead as any)[key] ?? null;
                          onLeadChange?.({ ...lead, [key]: val } as any);
                          if (!isPreviewMode) {
                            await supabase.from('leads').update({ [key]: val } as any).eq('id', lead.id);
                          }
                          if (prev !== val) {
                            import('@/lib/leadAudit').then(m => m.logAudit(lead.id, `🔄 ${label} date ${val ? (prev ? `changed: ${prev} → ${val}` : `set to ${val}`) : 'cleared'}`, { isPreview: isPreviewMode }));
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <Label className="text-[11px] text-muted-foreground">Estimated Settlement Date</Label>
                  <Input
                    type="date"
                    value={(lead as any).estimated_settlement_date ?? ''}
                    onChange={async (e) => {
                      const val = e.target.value || null;
                      onLeadChange?.({ ...lead, estimated_settlement_date: val } as any);
                      if (!isPreviewMode) {
                        await supabase.from('leads').update({ estimated_settlement_date: val } as any).eq('id', lead.id);
                      }
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Shown as "Estimated" in the Settlements dashboard until the deal is actually settled.
                  </p>
                </div>
              </SectionCard>
            );
          })()}

          {/* Read-only info */}
          <div className="grid grid-cols-2 gap-3 text-sm mt-2">
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
            {lead.source && (
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Source: {leadSources.find(s => s.name === lead.source)?.label || lead.source}</span>
              </div>
            )}
          </div>

        </div>

        <div className="p-6 space-y-5">
          {/* Documents */}
          <SectionCard
            icon={FileText}
            title="Documents"
            tone="neutral"
          >
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Automatic reminder emails</p>
                  <p className="text-xs text-muted-foreground">
                    Sends a nudge to the client (and co-applicants) on day 2, 4, 7, 11, 16, 22, and 30 while documents are still outstanding. Stops automatically when all docs are uploaded or the deal closes.
                  </p>
                </div>
                <Switch
                  checked={!lead.doc_reminders_paused}
                  onCheckedChange={async (checked) => {
                    const paused = !checked;
                    onLeadChange?.({ ...lead, doc_reminders_paused: paused });
                    if (isPreviewMode) { toast.success(paused ? 'Reminders paused (preview)' : 'Reminders enabled (preview)'); return; }
                    const { error } = await supabase.from('leads').update({ doc_reminders_paused: paused } as any).eq('id', lead.id);
                    if (error) { toast.error('Failed to update reminders'); onLeadChange?.({ ...lead, doc_reminders_paused: !paused }); }
                    else toast.success(paused ? 'Reminders paused' : 'Reminders enabled');
                  }}
                />
              </div>
              <DocumentCollectionPanel
                leadId={lead.id}
                isPreviewMode={isPreviewMode}
                primaryApplicantName={`${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || 'Primary Applicant'}
                primaryApplicantEmail={lead.email}
                primaryApplicantPhone={lead.phone}
                coApplicantContact={coApplicantContact ? {
                  id: coApplicantContact.id,
                  first_name: coApplicantContact.first_name,
                  last_name: coApplicantContact.last_name,
                  email: coApplicantContact.email,
                  phone: coApplicantContact.phone,
                } : null}
                onCoApplicantAdded={async ({ firstName, lastName, email, phone }) => {
                  if (isPreviewMode) return null;
                  const { data, error } = await supabase.from('contacts').insert({
                    first_name: firstName, last_name: lastName,
                    email: email || null, phone: phone || null,
                    type: 'client', created_by: user?.id,
                  } as any).select().single();
                  if (error || !data) { toast.error('Could not link co-applicant on deal card'); return null; }
                  const newId = (data as any).id as string;
                  await supabase.from('leads').update({ co_applicant_contact_id: newId } as any).eq('id', lead.id);
                  onLeadChange?.({ ...lead, co_applicant_contact_id: newId });
                  return newId;
                }}
                onCoApplicantRemoved={async () => {
                  if (isPreviewMode) return;
                  await supabase.from('leads').update({ co_applicant_contact_id: null } as any).eq('id', lead.id);
                  onLeadChange?.({ ...lead, co_applicant_contact_id: null });
                }}
              />
          </SectionCard>

          {/* Commission */}
          <SectionCard
            icon={DollarSign}
            title="Commission"
            tone="neutral"
          >
            <div className="space-y-3">
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
            </div>
          </SectionCard>

          <Separator />

          {/* Delete */}
          <div className="flex gap-2">
            {onDuplicateLead && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => onDuplicateLead(lead.id)}
              >
                <Copy className="w-4 h-4" /> Duplicate Lead
              </Button>
            )}
            <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="flex-1 gap-2">
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
        </div>
      </SheetContent>
      <Dialog
        open={!!openHeroTaskId}
        onOpenChange={(o) => { if (!o) setOpenHeroTaskId(null); }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Task</DialogTitle>
          </DialogHeader>
          {(() => {
            const t = tasks.find(x => x.id === openHeroTaskId);
            if (!t) return <p className="text-sm text-muted-foreground">Task not found.</p>;
            return renderTaskItem(t);
          })()}
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
