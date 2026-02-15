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
import { Search, TrendingUp, Clock, CheckCircle, AlertCircle, Filter, ListTodo, List, Columns, Building2, Users, BarChart3, DollarSign, Contact as ContactIcon, CalendarClock } from 'lucide-react';
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
  const [openContactId, setOpenContactId] = useState<string | null>(null);

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
      const seenEmails = new Set<string>();
      const merged: ReferrerProfileData[] = [];
      for (const p of allProfiles) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          if (p.email) seenEmails.add(p.email.toLowerCase());
          merged.push(p as unknown as ReferrerProfileData);
        }
      }
      // Also add any registered partners whose profiles don't have broker_id set
      if (registeredIds.length) {
        const { data: regProfiles } = await supabase.from('profiles').select('*').in('user_id', registeredIds);
        for (const p of regProfiles || []) {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            if (p.email) seenEmails.add(p.email.toLowerCase());
            merged.push(p as unknown as ReferrerProfileData);
          }
        }
      }

      // Also include contacts of type 'referrer' (added via Companies as agents)
      const { data: referrerContacts } = await supabase.from('contacts').select('*').eq('type', 'referrer');
      for (const c of referrerContacts || []) {
        // Skip if already present by email
        if (c.email && seenEmails.has(c.email.toLowerCase())) continue;
        const contactAsReferrer: ReferrerProfileData = {
          id: c.id,
          user_id: `contact-${c.id}`,
          full_name: `${c.first_name} ${c.last_name}`.trim(),
          email: c.email,
          phone: c.phone,
          company_name: c.company || null,
          company_id: null,
          date_of_birth: null,
          spouse_name: null,
          interests: null,
          address: null,
          license_number: null,
          custom_fields: {},
          broker_notes: c.notes,
          created_at: c.created_at,
        };
        merged.push(contactAsReferrer);
        if (c.email) seenEmails.add(c.email.toLowerCase());
      }

      setReferrers(merged);
    } catch (err) {
      console.error('fetchReferrers failed:', err);
      setReferrers([]);
    }
  };

  const fetchContacts = async () => {
    const { data: contactsData } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
    const contactsList = (contactsData as unknown as Contact[]) || [];

    // Also include referral partners from profiles as contacts
    if (!isPreviewMode) {
      const { data: partnerProfiles } = await supabase.from('profiles').select('user_id, full_name, email, phone, company_name, created_at').not('broker_id', 'is', null);
      if (partnerProfiles && partnerProfiles.length > 0) {
        const contactEmails = new Set(contactsList.map(c => c.email?.toLowerCase()).filter(Boolean));
        const referrerContacts: Contact[] = partnerProfiles
          .filter(r => !r.email || !contactEmails.has(r.email.toLowerCase()))
          .map(r => {
            const nameParts = (r.full_name || '').split(' ');
            return {
              id: `referrer-${r.user_id}`,
              first_name: nameParts[0] || '',
              last_name: nameParts.slice(1).join(' ') || '',
              email: r.email || null,
              phone: r.phone || null,
              company: r.company_name || null,
              type: 'referrer',
              notes: null,
              created_by: null,
              created_at: r.created_at || new Date().toISOString(),
              updated_at: r.created_at || new Date().toISOString(),
            };
          });
        setContacts([...contactsList, ...referrerContacts]);
        return;
      }
    }
    setContacts(contactsList);
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

    // Auto-create settlement when lead moves to "settled"
    if (status === 'settled' && oldStatus !== 'settled' && lead && user) {
      const srcContact = lead.source_contact_id ? contacts.find(ct => ct.id === lead.source_contact_id) : null;
      const contactName = srcContact ? `${srcContact.first_name} ${srcContact.last_name}`.trim() : null;
      const { error: settError } = await supabase.from('settlements').insert({
        broker_id: user.id,
        client_name: `${lead.first_name} ${lead.last_name}`.trim(),
        settlement_date: new Date().toISOString().split('T')[0],
        loan_amount: lead.loan_amount || 0,
        lead_source: lead.source || null,
        status: 'settled',
        contact_name: contactName || null,
      } as any);
      if (settError) {
        console.error('Failed to auto-create settlement:', settError);
        toast.error('Status updated but failed to create settlement record');
      } else {
        toast.success('Settlement record created automatically');
      }
    }

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
          {/* Navigation Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {[
              { value: 'leads', label: 'Leads', icon: TrendingUp },
              { value: 'tasks', label: 'Tasks', icon: ListTodo },
              { value: 'contacts', label: 'Contacts', icon: ContactIcon },
              { value: 'companies', label: 'Companies', icon: Building2 },
              { value: 'referrers', label: 'Referrers', icon: Users },
              { value: 'reports', label: 'Reports', icon: BarChart3 },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-4 text-sm font-medium transition-all
                  ${activeTab === tab.value
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-xs">{tab.label}</span>
              </button>
            ))}
          </div>

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
            <ContactsManagement contacts={contacts} onRefresh={fetchContacts} isPreviewMode={isPreviewMode} openContactId={openContactId} onContactOpened={() => setOpenContactId(null)} />
          </TabsContent>

          <TabsContent value="companies" className="mt-4">
            <CompanyManagement companies={companies} onRefresh={fetchCompanies} onRefreshContacts={fetchContacts} isPreviewMode={isPreviewMode} referrers={referrers} contacts={contacts} onOpenContact={(contactId) => { setSheetOpen(false); setActiveTab('contacts'); setTimeout(() => setOpenContactId(contactId), 300); }} />
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
          setTimeout(() => setOpenContactId(contactId), 300);
        }}
        sampleNotes={isPreviewMode && selectedLead ? (SAMPLE_NOTES[selectedLead.id] || []) as any : undefined}
      />
    </div>
  );
}
