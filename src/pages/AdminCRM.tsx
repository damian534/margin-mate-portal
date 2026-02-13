import { useEffect, useState, useMemo } from 'react';
import { LeadDetailSheet } from '@/components/LeadDetailSheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLeadStatuses } from '@/hooks/useLeadStatuses';
import { SAMPLE_LEADS_WITH_REFERRERS, SAMPLE_NOTES, SAMPLE_COMPANIES, SAMPLE_REFERRERS } from '@/lib/sample-data';
import { AppHeader } from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { TasksPanel } from '@/components/TasksPanel';
import { LeadsKanban } from '@/components/LeadsKanban';
import { StatusSettings } from '@/components/StatusSettings';
import { CompanyManagement, Company } from '@/components/CompanyManagement';
import { ReferrerProfiles, ReferrerProfileData } from '@/components/ReferrerProfile';
import { ReferrerReports } from '@/components/ReferrerReports';
import { AddLeadDialog } from '@/components/AddLeadDialog';
import { ContactsManagement, Contact } from '@/components/ContactsManagement';
import { InviteCodeManagement } from '@/components/InviteCodeManagement';
import { UserManagement } from '@/components/UserManagement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { notifyPartnerStatusChange } from '@/lib/notifications';
import { Search, TrendingUp, Clock, CheckCircle, AlertCircle, Filter, ListTodo, List, Columns, Building2, Users, BarChart3, DollarSign, Contact as ContactIcon, KeyRound, UserCog, CalendarClock } from 'lucide-react';
import { isPast, isToday, isTomorrow } from 'date-fns';

type TaskDueFilter = 'all_leads' | 'overdue' | 'today' | 'tomorrow' | 'later' | 'no_tasks';

interface LeadTask {
  id: string;
  lead_id: string;
  due_date: string | null;
  completed: boolean;
}

function getLeadTaskDueCategory(leadId: string, tasksByLead: Map<string, LeadTask[]>): TaskDueFilter {
  const tasks = tasksByLead.get(leadId);
  if (!tasks || tasks.length === 0) return 'no_tasks';
  const activeTasks = tasks.filter(t => !t.completed);
  if (activeTasks.length === 0) return 'no_tasks';
  // Use the earliest due task to categorize
  const withDue = activeTasks.filter(t => t.due_date).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  if (withDue.length === 0) return 'later'; // has tasks but no dates
  const earliest = new Date(withDue[0].due_date!);
  if (isToday(earliest)) return 'today';
  if (isTomorrow(earliest)) return 'tomorrow';
  if (isPast(earliest)) return 'overdue';
  return 'later';
}

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


interface LeadSource {
  id: string;
  name: string;
  label: string;
  display_order: number;
}



export default function AdminCRM() {
  const { user, isPreviewMode } = useAuth();
  const { statuses, addStatus, updateStatus: updateLeadStatus, deleteStatus, reorderStatuses } = useLeadStatuses();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leadsView, setLeadsView] = useState<'table' | 'kanban'>('table');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [referrers, setReferrers] = useState<ReferrerProfileData[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [activeTab, setActiveTab] = useState('leads');
  const [reportReferrerId, setReportReferrerId] = useState<string | null>(null);
  const [taskDueFilter, setTaskDueFilter] = useState<TaskDueFilter>('all_leads');
  const [leadTasks, setLeadTasks] = useState<LeadTask[]>([]);

  const defaultSources: LeadSource[] = [
    { id: 's1', name: 'referral_partner', label: 'Referral Partner', display_order: 1 },
    { id: 's2', name: 'google', label: 'Google', display_order: 2 },
    { id: 's3', name: 'existing_client', label: 'Existing Client', display_order: 3 },
    { id: 's4', name: 'client_referral', label: 'Referral from Existing Client', display_order: 4 },
    { id: 's5', name: 'instagram', label: 'Instagram', display_order: 5 },
    { id: 's6', name: 'facebook', label: 'Facebook', display_order: 6 },
    { id: 's7', name: 'direct_call', label: 'Direct Call', display_order: 7 },
    { id: 's8', name: 'walk_in', label: 'Walk In', display_order: 8 },
  ];

  useEffect(() => {
    if (isPreviewMode) {
      setLeads(SAMPLE_LEADS_WITH_REFERRERS as Lead[]);
      setCompanies(SAMPLE_COMPANIES as Company[]);
      setReferrers(SAMPLE_REFERRERS as ReferrerProfileData[]);
      setLeadSources(defaultSources);
      setContacts([
        { id: 'c1', first_name: 'John', last_name: 'Smith', email: 'john@email.com', phone: '0411 222 333', company: 'Smith & Co', type: 'client', notes: 'Existing client since 2023', created_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'c2', first_name: 'Maria', last_name: 'Garcia', email: 'maria@email.com', phone: '0422 444 555', company: null, type: 'prospect', notes: null, created_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);
      setLoading(false);
      return;
    }
    fetchLeads();
    fetchCompanies();
    fetchReferrers();
    fetchContacts();
    fetchLeadSources();
    fetchLeadTasks();
  }, [isPreviewMode]);

  const tasksByLead = useMemo(() => {
    const map = new Map<string, LeadTask[]>();
    for (const t of leadTasks) {
      const arr = map.get(t.lead_id) || [];
      arr.push(t);
      map.set(t.lead_id, arr);
    }
    return map;
  }, [leadTasks]);

  useEffect(() => {
    let result = leads;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        getReferrerName(l.referral_partner_id)?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(l => l.status === statusFilter);
    }
    if (taskDueFilter !== 'all_leads') {
      result = result.filter(l => getLeadTaskDueCategory(l.id, tasksByLead) === taskDueFilter);
    }
    setFilteredLeads(result);
  }, [leads, search, statusFilter, taskDueFilter, referrers, tasksByLead]);

  const fetchLeads = async () => {
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    setLeads((data as Lead[]) || []);
    setLoading(false);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('*').order('name');
    setCompanies((data as Company[]) || []);
  };

  const fetchReferrers = async () => {
    try {
      // Fetch profiles that are referral_partners (registered) OR manually added (have broker_id but no role yet)
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'referral_partner');
      const registeredIds = roles?.map(r => r.user_id) || [];
      
      // Fetch all profiles with broker_id (includes manually added ones)
      const { data: brokerProfiles, error: bpError } = await supabase.from('profiles').select('*').not('broker_id', 'is', null);
      if (bpError) console.error('Error fetching broker profiles:', bpError);
      
      // Merge: registered partners + manually added ones (avoid duplicates)
      const allProfiles = brokerProfiles || [];
      const seen = new Set<string>();
      const merged: ReferrerProfileData[] = [];
      for (const p of allProfiles) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          merged.push(p as unknown as ReferrerProfileData);
        }
      }
      // Also add any registered partners whose profiles don't have broker_id set
      if (registeredIds.length) {
        const { data: regProfiles } = await supabase.from('profiles').select('*').in('user_id', registeredIds);
        for (const p of regProfiles || []) {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            merged.push(p as unknown as ReferrerProfileData);
          }
        }
      }
      setReferrers(merged);
    } catch (err) {
      console.error('fetchReferrers failed:', err);
      setReferrers([]);
    }
  };

  const fetchContacts = async () => {
    const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
    setContacts((data as unknown as Contact[]) || []);
  };

  const fetchLeadSources = async () => {
    const { data } = await supabase.from('lead_sources').select('*').order('display_order');
    setLeadSources((data as unknown as LeadSource[]) || []);
  };

  const fetchLeadTasks = async () => {
    const { data } = await supabase.from('tasks').select('id, lead_id, due_date, completed');
    setLeadTasks((data as LeadTask[]) || []);
  };

  const openLead = (lead: Lead) => {
    setSelectedLead(lead);
    setSheetOpen(true);
  };

  const updateStatus = async (leadId: string, status: string) => {
    if (isPreviewMode) {
      toast.success('Status updated (preview)');
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
      if (selectedLead?.id === leadId) setSelectedLead(prev => prev ? { ...prev, status } : null);
      return;
    }
    const lead = leads.find(l => l.id === leadId);
    const oldStatus = lead?.status || '';
    const { error } = await supabase.from('leads').update({ status: status as any }).eq('id', leadId);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success('Status updated');
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
    if (selectedLead?.id === leadId) setSelectedLead(prev => prev ? { ...prev, status } : null);
    // Send email notification to partner if lead has one
    if (lead?.referral_partner_id && oldStatus !== status) {
      const statusConfig = statuses.find(s => s.name === status);
      notifyPartnerStatusChange(lead, oldStatus, status, statusConfig?.label || status)
        .catch(err => console.error('Status email notification failed:', err));
    }
  };



  const updateCommission = async (leadId: string, fields: Record<string, any>) => {
    if (isPreviewMode) { toast.success('Commission updated (preview)'); setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...fields } : l)); return; }
    const { error } = await supabase.from('leads').update(fields as any).eq('id', leadId);
    if (error) { toast.error('Failed to update commission'); return; }
    toast.success('Commission updated');
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...fields } : l));
  };

  const deleteLead = async (leadId: string) => {
    if (isPreviewMode) {
      toast.success('Lead deleted (preview)');
      setLeads(prev => prev.filter(l => l.id !== leadId));
      setSheetOpen(false);
      setSelectedLead(null);
      return;
    }
    // Delete related notes and tasks first
    await supabase.from('notes').delete().eq('lead_id', leadId);
    await supabase.from('tasks').delete().eq('lead_id', leadId);
    const { error } = await supabase.from('leads').delete().eq('id', leadId);
    if (error) {
      toast.error('Failed to delete lead');
      console.error(error);
      return;
    }
    toast.success('Lead deleted');
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setSheetOpen(false);
    setSelectedLead(null);
  };

  const getReferrerName = (partnerId: string | null) => {
    if (!partnerId) return null;
    const r = referrers.find(ref => ref.user_id === partnerId);
    return r?.full_name || null;
  };

  const getReferrerCompany = (partnerId: string | null) => {
    if (!partnerId) return null;
    const r = referrers.find(ref => ref.user_id === partnerId);
    if (!r?.company_id) return null;
    return companies.find(c => c.id === r.company_id)?.name || null;
  };

  const stats = {
    total: leads.length,
    newLeads: leads.filter(l => l.status === 'new').length,
    active: leads.filter(l => !['settled', 'lost', 'new'].includes(l.status)).length,
    settled: leads.filter(l => l.status === 'settled').length,
  };

  const handleViewReport = (referrerId: string) => {
    setReportReferrerId(referrerId);
    setActiveTab('reports');
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold">Lead Management</h1>
          <p className="text-muted-foreground">Manage all referral leads in one place</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Leads', value: stats.total, icon: TrendingUp, accent: 'primary' },
            { label: 'New', value: stats.newLeads, icon: AlertCircle, accent: 'accent' },
            { label: 'In Progress', value: stats.active, icon: Clock, accent: 'warning' },
            { label: 'Settled', value: stats.settled, icon: CheckCircle, accent: 'success' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg bg-${s.accent}/10 flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 text-${s.accent}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-1.5">
              <ListTodo className="w-4 h-4" /> Tasks
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-1.5">
              <ContactIcon className="w-4 h-4" /> Contacts
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4" /> Companies
            </TabsTrigger>
            <TabsTrigger value="referrers" className="flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Referrers
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" /> Reports
            </TabsTrigger>
            <TabsTrigger value="invites" className="flex items-center gap-1.5">
              <KeyRound className="w-4 h-4" /> Invites
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1.5">
              <UserCog className="w-4 h-4" /> Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="space-y-4 mt-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search leads or referrer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="w-4 h-4 mr-2" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map(s => <SelectItem key={s.name} value={s.name}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {/* View toggle */}
              <div className="flex items-center border rounded-md">
                <Button variant={leadsView === 'table' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2" onClick={() => setLeadsView('table')}>
                  <List className="w-4 h-4" />
                </Button>
                <Button variant={leadsView === 'kanban' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2" onClick={() => setLeadsView('kanban')}>
                  <Columns className="w-4 h-4" />
                </Button>
              </div>
              <StatusSettings
                statuses={statuses}
                onAdd={addStatus}
                onUpdate={updateLeadStatus}
                onDelete={deleteStatus}
                onReorder={reorderStatuses}
              />
              <AddLeadDialog
                leadSources={leadSources}
                referrers={referrers}
                contacts={contacts}
                isPreviewMode={isPreviewMode}
                onLeadAdded={() => { if (isPreviewMode) return; fetchLeads(); }}
                onContactCreated={() => { if (!isPreviewMode) fetchContacts(); }}
              />
            </div>

            {/* Task due date filter */}
            <div className="flex items-center gap-1 flex-wrap">
              <CalendarClock className="w-4 h-4 text-muted-foreground mr-1" />
              {([
                { value: 'all_leads' as TaskDueFilter, label: 'All Leads' },
                { value: 'overdue' as TaskDueFilter, label: 'Overdue Tasks' },
                { value: 'today' as TaskDueFilter, label: 'Due Today' },
                { value: 'tomorrow' as TaskDueFilter, label: 'Due Tomorrow' },
                { value: 'later' as TaskDueFilter, label: 'Due Later' },
                { value: 'no_tasks' as TaskDueFilter, label: 'No Tasks' },
              ]).map(opt => {
                const count = opt.value === 'all_leads' ? leads.length : leads.filter(l => getLeadTaskDueCategory(l.id, tasksByLead) === opt.value).length;
                return (
                  <Button
                    key={opt.value}
                    variant={taskDueFilter === opt.value ? 'secondary' : 'ghost'}
                    size="sm"
                    className={`h-7 text-xs gap-1.5 ${opt.value === 'overdue' && count > 0 && taskDueFilter !== opt.value ? 'text-destructive' : ''}`}
                    onClick={() => setTaskDueFilter(opt.value)}
                  >
                    {opt.label}
                    {count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        taskDueFilter === opt.value ? 'bg-background text-foreground' :
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

            {/* Leads view */}
            {loading ? (
              <p className="text-muted-foreground text-center py-12">Loading leads...</p>
            ) : leadsView === 'kanban' ? (
              <LeadsKanban
                leads={filteredLeads}
                statuses={statuses}
                leadSources={leadSources}
                getReferrerName={getReferrerName}
                getReferrerCompany={getReferrerCompany}
                getContactName={(contactId) => {
                  if (!contactId) return null;
                  const c = contacts.find(ct => ct.id === contactId);
                  return c ? `${c.first_name} ${c.last_name}` : null;
                }}
                onOpenLead={openLead}
                onUpdateStatus={updateStatus}
                tasksByLead={tasksByLead}
                taskDueFilter={taskDueFilter}
              />
            ) : filteredLeads.length === 0 ? (
              <Card><CardContent className="p-0"><p className="text-muted-foreground text-center py-12">No leads found</p></CardContent></Card>
            ) : (
              <div className="space-y-6">
                {statuses.map(status => {
                  const statusLeads = filteredLeads.filter(l => l.status === status.name);
                  if (statusLeads.length === 0 && !status) return null;
                  return (
                    <div
                      key={status.name}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const leadId = e.dataTransfer.getData('leadId');
                        if (leadId) updateStatus(leadId, status.name);
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                        <h3 className="text-sm font-semibold">{status.label}</h3>
                        <span className="text-xs text-muted-foreground">({statusLeads.length})</span>
                      </div>
                      {statusLeads.length === 0 ? (
                        <div className="border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
                          Drop leads here
                        </div>
                      ) : (
                      <Card>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Client</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Referrer</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {statusLeads.map(lead => (
                                <TableRow
                                  key={lead.id}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('leadId', lead.id);
                                    e.dataTransfer.effectAllowed = 'move';
                                  }}
                                  className="cursor-grab active:cursor-grabbing hover:bg-muted/50"
                                  onClick={() => openLead(lead)}
                                >
                                  <TableCell className="font-medium">{lead.first_name} {lead.last_name}</TableCell>
                                  <TableCell>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                                      {leadSources.find(s => s.name === lead.source)?.label || lead.source || '—'}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <p className="font-medium">{getReferrerName(lead.referral_partner_id) || '—'}</p>
                                      {getReferrerCompany(lead.referral_partner_id) && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Building2 className="w-3 h-3" />
                                          {getReferrerCompany(lead.referral_partner_id)}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      {lead.email && <p>{lead.email}</p>}
                                      {lead.phone && <p className="text-muted-foreground">{lead.phone}</p>}
                                    </div>
                                  </TableCell>
                                  <TableCell>{lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : '—'}</TableCell>
                                  <TableCell><StatusBadge status={lead.status} statuses={statuses} /></TableCell>
                                  <TableCell className="text-muted-foreground">{format(new Date(lead.created_at), 'dd MMM')}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                      )}
                    </div>
                  );
                })}
                {/* Leads with statuses not in the configured list */}
                {(() => {
                  const knownStatuses = statuses.map(s => s.name);
                  const uncategorized = filteredLeads.filter(l => !knownStatuses.includes(l.status));
                  if (uncategorized.length === 0) return null;
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                        <h3 className="text-sm font-semibold">Other</h3>
                        <span className="text-xs text-muted-foreground">({uncategorized.length})</span>
                      </div>
                      <Card>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Client</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Referrer</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {uncategorized.map(lead => (
                                <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openLead(lead)}>
                                  <TableCell className="font-medium">{lead.first_name} {lead.last_name}</TableCell>
                                  <TableCell>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                                      {leadSources.find(s => s.name === lead.source)?.label || lead.source || '—'}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <p className="font-medium">{getReferrerName(lead.referral_partner_id) || '—'}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      {lead.email && <p>{lead.email}</p>}
                                      {lead.phone && <p className="text-muted-foreground">{lead.phone}</p>}
                                    </div>
                                  </TableCell>
                                  <TableCell>{lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : '—'}</TableCell>
                                  <TableCell><StatusBadge status={lead.status} statuses={statuses} /></TableCell>
                                  <TableCell className="text-muted-foreground">{format(new Date(lead.created_at), 'dd MMM')}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <TasksPanel
              leads={leads.map(l => ({ id: l.id, first_name: l.first_name, last_name: l.last_name }))}
              onOpenLead={(leadId) => { const lead = leads.find(l => l.id === leadId); if (lead) openLead(lead); }}
            />
          </TabsContent>

          <TabsContent value="contacts" className="mt-4">
            <ContactsManagement contacts={contacts} onRefresh={fetchContacts} isPreviewMode={isPreviewMode} />
          </TabsContent>

          <TabsContent value="companies" className="mt-4">
            <CompanyManagement companies={companies} onRefresh={fetchCompanies} isPreviewMode={isPreviewMode} />
          </TabsContent>

          <TabsContent value="referrers" className="mt-4">
            <ReferrerProfiles
              referrers={referrers}
              companies={companies}
              onRefresh={fetchReferrers}
              isPreviewMode={isPreviewMode}
              onViewReport={handleViewReport}
            />
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <ReferrerReports
              leads={leads}
              referrers={referrers}
              companies={companies}
              statuses={statuses}
              selectedReferrerId={reportReferrerId}
              leadSources={leadSources}
            />
          </TabsContent>

          <TabsContent value="invites" className="mt-4">
            <InviteCodeManagement />
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </main>

      {/* Lead Detail Sheet */}
      <LeadDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        lead={selectedLead}
        statuses={statuses}
        leadSources={leadSources}
        referrerName={selectedLead ? getReferrerName(selectedLead.referral_partner_id) : null}
        referrerCompany={selectedLead ? getReferrerCompany(selectedLead.referral_partner_id) : null}
        sourceContactName={selectedLead?.source_contact_id ? (() => {
          const c = contacts.find(ct => ct.id === selectedLead.source_contact_id);
          return c ? `${c.first_name} ${c.last_name}` : null;
        })() : null}
        isPreviewMode={isPreviewMode}
        onUpdateStatus={updateStatus}
        onUpdateCommission={updateCommission}
        onDeleteLead={deleteLead}
        onLeadChange={(updated) => {
          setSelectedLead(updated);
          setLeads(prev => prev.map(l => l.id === updated.id ? { ...l, ...updated } : l));
        }}
        onOpenContact={(contactId) => {
          setSheetOpen(false);
          setActiveTab('contacts');
          // Small delay to let the sheet close before switching tabs
          setTimeout(() => {
            const contactEl = document.getElementById(`contact-${contactId}`);
            contactEl?.scrollIntoView({ behavior: 'smooth' });
          }, 300);
        }}
        sampleNotes={isPreviewMode && selectedLead ? (SAMPLE_NOTES[selectedLead.id] || []) as any : undefined}
      />
    </div>
  );
}
