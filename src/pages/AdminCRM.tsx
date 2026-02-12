import { useEffect, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search, TrendingUp, Clock, CheckCircle, AlertCircle, Send, Filter, ListTodo, List, Columns, Building2, Users, BarChart3, DollarSign, Contact as ContactIcon, KeyRound } from 'lucide-react';

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

interface LeadSource {
  id: string;
  name: string;
  label: string;
  display_order: number;
}

interface Note {
  id: string;
  content: string;
  notify_partner: boolean;
  created_at: string;
  author_id: string | null;
}

export default function AdminCRM() {
  const { user, isPreviewMode } = useAuth();
  const { statuses, addStatus, updateStatus: updateLeadStatus, deleteStatus, reorderStatuses } = useLeadStatuses();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newNote, setNewNote] = useState('');
  const [notifyPartner, setNotifyPartner] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leadsView, setLeadsView] = useState<'table' | 'kanban'>('table');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [referrers, setReferrers] = useState<ReferrerProfileData[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [activeTab, setActiveTab] = useState('leads');
  const [reportReferrerId, setReportReferrerId] = useState<string | null>(null);

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
  }, [isPreviewMode]);

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
    setFilteredLeads(result);
  }, [leads, search, statusFilter, referrers]);

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
    // Fetch profiles that are referral_partners
    const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'referral_partner');
    if (!roles?.length) { setReferrers([]); return; }
    const ids = roles.map(r => r.user_id);
    const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', ids);
    setReferrers((profiles as unknown as ReferrerProfileData[]) || []);
  };

  const fetchContacts = async () => {
    const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
    setContacts((data as unknown as Contact[]) || []);
  };

  const fetchLeadSources = async () => {
    const { data } = await supabase.from('lead_sources').select('*').order('display_order');
    setLeadSources((data as unknown as LeadSource[]) || []);
  };

  const fetchNotes = async (leadId: string) => {
    if (isPreviewMode) { setNotes((SAMPLE_NOTES[leadId] || []) as Note[]); return; }
    const { data } = await supabase.from('notes').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
    setNotes((data as Note[]) || []);
  };

  const openLead = (lead: Lead) => {
    setSelectedLead(lead);
    setSheetOpen(true);
    fetchNotes(lead.id);
  };

  const updateStatus = async (leadId: string, status: string) => {
    if (isPreviewMode) {
      toast.success('Status updated (preview)');
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
      if (selectedLead?.id === leadId) setSelectedLead(prev => prev ? { ...prev, status } : null);
      return;
    }
    const { error } = await supabase.from('leads').update({ status: status as any }).eq('id', leadId);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success('Status updated');
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
    if (selectedLead?.id === leadId) setSelectedLead(prev => prev ? { ...prev, status } : null);
  };

  const addNote = async () => {
    if (!newNote.trim() || !selectedLead || !user) return;
    if (isPreviewMode) {
      const fakeNote: Note = { id: `preview-${Date.now()}`, content: newNote.trim(), notify_partner: notifyPartner, created_at: new Date().toISOString(), author_id: user.id };
      setNotes(prev => [fakeNote, ...prev]);
      toast.success(notifyPartner ? 'Note added & partner notified (preview)' : 'Note added (preview)');
      setNewNote(''); setNotifyPartner(false); return;
    }
    const { error } = await supabase.from('notes').insert({ lead_id: selectedLead.id, author_id: user.id, content: newNote.trim(), notify_partner: notifyPartner });
    if (error) { toast.error('Failed to add note'); return; }
    toast.success(notifyPartner ? 'Note added & partner notified' : 'Note added');
    setNewNote(''); setNotifyPartner(false);
    fetchNotes(selectedLead.id);
  };

  const updateCommission = async (leadId: string, fields: Record<string, any>) => {
    if (isPreviewMode) { toast.success('Commission updated (preview)'); setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...fields } : l)); return; }
    const { error } = await supabase.from('leads').update(fields as any).eq('id', leadId);
    if (error) { toast.error('Failed to update commission'); return; }
    toast.success('Commission updated');
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...fields } : l));
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

            {/* Leads view */}
            {loading ? (
              <p className="text-muted-foreground text-center py-12">Loading leads...</p>
            ) : leadsView === 'kanban' ? (
              <LeadsKanban
                leads={filteredLeads}
                statuses={statuses}
                onOpenLead={openLead}
                onUpdateStatus={updateStatus}
              />
            ) : filteredLeads.length === 0 ? (
              <Card><CardContent className="p-0"><p className="text-muted-foreground text-center py-12">No leads found</p></CardContent></Card>
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
                      {filteredLeads.map(lead => (
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
        </Tabs>
      </main>

      {/* Lead Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl">{selectedLead.first_name} {selectedLead.last_name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Referrer info */}
                {getReferrerName(selectedLead.referral_partner_id) && (
                  <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Referred by {getReferrerName(selectedLead.referral_partner_id)}</p>
                      {getReferrerCompany(selectedLead.referral_partner_id) && (
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {getReferrerCompany(selectedLead.referral_partner_id)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedLead.email && <div><p className="text-muted-foreground">Email</p><p className="font-medium">{selectedLead.email}</p></div>}
                    {selectedLead.phone && <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{selectedLead.phone}</p></div>}
                    {selectedLead.loan_purpose && <div><p className="text-muted-foreground">Purpose</p><p className="font-medium">{selectedLead.loan_purpose}</p></div>}
                    {selectedLead.loan_amount && <div><p className="text-muted-foreground">Amount</p><p className="font-medium">${selectedLead.loan_amount.toLocaleString()}</p></div>}
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selectedLead.status} onValueChange={(v) => updateStatus(selectedLead.id, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map(s => <SelectItem key={s.name} value={s.name}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                {/* Commission Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> Commission
                  </h3>
                  <div className="space-y-3">
                    {/* Referrer Commission */}
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Referrer Commission</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Amount ($)</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={selectedLead.referrer_commission ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              setSelectedLead(prev => prev ? { ...prev, referrer_commission: val } : null);
                            }}
                            onBlur={() => updateCommission(selectedLead.id, { referrer_commission: selectedLead.referrer_commission })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={selectedLead.referrer_commission_type}
                            onValueChange={(v) => {
                              setSelectedLead(prev => prev ? { ...prev, referrer_commission_type: v } : null);
                              updateCommission(selectedLead.id, { referrer_commission_type: v });
                            }}
                          >
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="per_lead">Per Lead</SelectItem>
                              <SelectItem value="on_settlement">On Settlement</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="ref-paid"
                          checked={selectedLead.referrer_commission_paid}
                          onCheckedChange={(v) => {
                            const paid = v === true;
                            setSelectedLead(prev => prev ? { ...prev, referrer_commission_paid: paid } : null);
                            updateCommission(selectedLead.id, { referrer_commission_paid: paid });
                          }}
                        />
                        <Label htmlFor="ref-paid" className="text-xs cursor-pointer">Paid</Label>
                      </div>
                    </div>
                    {/* Company Commission */}
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Company/Agency Commission</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Amount ($)</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={selectedLead.company_commission ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              setSelectedLead(prev => prev ? { ...prev, company_commission: val } : null);
                            }}
                            onBlur={() => updateCommission(selectedLead.id, { company_commission: selectedLead.company_commission })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={selectedLead.company_commission_type}
                            onValueChange={(v) => {
                              setSelectedLead(prev => prev ? { ...prev, company_commission_type: v } : null);
                              updateCommission(selectedLead.id, { company_commission_type: v });
                            }}
                          >
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="per_lead">Per Lead</SelectItem>
                              <SelectItem value="on_settlement">On Settlement</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="co-paid"
                          checked={selectedLead.company_commission_paid}
                          onCheckedChange={(v) => {
                            const paid = v === true;
                            setSelectedLead(prev => prev ? { ...prev, company_commission_paid: paid } : null);
                            updateCommission(selectedLead.id, { company_commission_paid: paid });
                          }}
                        />
                        <Label htmlFor="co-paid" className="text-xs cursor-pointer">Paid</Label>
                      </div>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Add Note</h3>
                  <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="e.g. Called the client, will call back after 5pm..." rows={3} maxLength={2000} />
                  <div className="flex items-center gap-2">
                    <Checkbox id="notify" checked={notifyPartner} onCheckedChange={(v) => setNotifyPartner(v === true)} />
                    <Label htmlFor="notify" className="text-sm cursor-pointer">Notify referral partner via email</Label>
                  </div>
                  <Button onClick={addNote} disabled={!newNote.trim()} size="sm"><Send className="w-4 h-4 mr-2" /> Add Note</Button>
                </div>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Activity</h3>
                  <ScrollArea className="h-64">
                    {notes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No notes yet</p>
                    ) : (
                      <div className="space-y-3">
                        {notes.map(note => (
                          <div key={note.id} className="bg-muted rounded-lg p-3">
                            <p className="text-sm">{note.content}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <p className="text-xs text-muted-foreground">{format(new Date(note.created_at), 'dd MMM yyyy, HH:mm')}</p>
                              {note.notify_partner && <span className="text-xs bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded">Partner notified</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
