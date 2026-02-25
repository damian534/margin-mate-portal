import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLeadStatuses } from '@/hooks/useLeadStatuses';
import { SAMPLE_LEADS, SAMPLE_NOTES } from '@/lib/sample-data';
import { AppHeader } from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { LeadsKanban } from '@/components/LeadsKanban';
import { CompanyCRM } from '@/components/company/CompanyCRM';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, TrendingUp, Clock, CheckCircle, List, Columns, Crown } from 'lucide-react';
import { format } from 'date-fns';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  loan_amount: number | null;
  loan_purpose: string | null;
  status: string;
  source: string | null;
  created_at: string;
  referral_partner_id: string | null;
  referrer_commission: number | null;
  referrer_commission_paid: boolean | null;
  company_commission: number | null;
  company_commission_paid: boolean | null;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
}

export default function PartnerDashboard() {
  const { user, isPreviewMode } = useAuth();
  const { statuses } = useLeadStatuses();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadsView, setLeadsView] = useState<'table' | 'kanban'>('table');
  const [activeTab, setActiveTab] = useState('my-leads');

  // Director state
  const [isDirector, setIsDirector] = useState(false);
  const [directorCompany, setDirectorCompany] = useState<any>(null);
  const [directorReferrers, setDirectorReferrers] = useState<any[]>([]);
  const [directorLeads, setDirectorLeads] = useState<Lead[]>([]);

  useEffect(() => {
    if (isPreviewMode) {
      setLeads(SAMPLE_LEADS as unknown as Lead[]);
      setLoading(false);
      return;
    }
    if (!user) return;
    fetchLeads();
    checkDirectorStatus();
  }, [user, isPreviewMode]);

  const checkDirectorStatus = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_director, company_id, company_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile && (profile as any).is_director && (profile as any).company_id) {
      setIsDirector(true);

      // Fetch the company record
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', (profile as any).company_id)
        .maybeSingle();

      if (company) {
        setDirectorCompany(company);
      }

      // Fetch all profiles in same company (these are the referrers/agents)
      const { data: agents } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', (profile as any).company_id);

      setDirectorReferrers(agents || []);

      // Fetch all leads for company agents (director RLS policy allows this)
      const agentIds = (agents || []).filter((a: any) => a.user_id).map((a: any) => a.user_id);
      if (agentIds.length > 0) {
        const { data: cLeads } = await supabase
          .from('leads')
          .select('*')
          .in('referral_partner_id', agentIds)
          .order('created_at', { ascending: false });
        setDirectorLeads((cLeads as Lead[]) || []);
      }
    }
  };

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('referral_partner_id', user!.id)
      .order('created_at', { ascending: false });
    setLeads((data as Lead[]) || []);
    setLoading(false);
  };

  const fetchNotes = async (leadId: string) => {
    if (isPreviewMode) {
      setNotes((SAMPLE_NOTES[leadId] || []) as Note[]);
      return;
    }
    const { data } = await supabase
      .from('notes')
      .select('id, content, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    setNotes((data as Note[]) || []);
  };

  const stats = {
    total: leads.length,
    active: leads.filter(l => !['settled', 'lost'].includes(l.status)).length,
    settled: leads.filter(l => l.status === 'settled').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold">
              {isDirector && directorCompany ? (
                <span className="flex items-center gap-2">
                  <Crown className="w-7 h-7 text-primary" />
                  {directorCompany.name} Dashboard
                </span>
              ) : 'My Referrals'}
            </h1>
            <p className="text-muted-foreground">
              {isDirector ? 'Director view — full company CRM' : 'Track all your submitted leads'}
            </p>
          </div>
          <Button onClick={() => navigate('/submit-referral')}>
            <Plus className="w-4 h-4 mr-2" /> New Referral
          </Button>
        </div>

        {/* Stats - My leads always shown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">My Referrals</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.settled}</p>
                <p className="text-sm text-muted-foreground">Settled</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isDirector && directorCompany ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-leads">My Leads</TabsTrigger>
              <TabsTrigger value="company" className="gap-1.5"><Crown className="w-4 h-4" /> Company CRM</TabsTrigger>
            </TabsList>

            <TabsContent value="my-leads" className="mt-4">
              {renderMyLeads()}
            </TabsContent>

            <TabsContent value="company" className="mt-4">
              <CompanyCRM
                company={directorCompany}
                leads={directorLeads}
                referrers={directorReferrers}
                contacts={[]}
                onBack={() => setActiveTab('my-leads')}
                isPreviewMode={isPreviewMode}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            {renderLeadsHeader()}
            {renderLeadsContent()}
          </>
        )}
      </main>
    </div>
  );

  function renderLeadsHeader() {
    return (
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading font-semibold">Your Leads</h2>
          <p className="text-sm text-muted-foreground">Click on a lead to see broker updates</p>
        </div>
        <div className="flex items-center border rounded-md">
          <Button variant={leadsView === 'table' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2" onClick={() => setLeadsView('table')}>
            <List className="w-4 h-4" />
          </Button>
          <Button variant={leadsView === 'kanban' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2" onClick={() => setLeadsView('kanban')}>
            <Columns className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  function renderLeadsContent() {
    if (loading) return <p className="text-muted-foreground text-center py-8">Loading...</p>;
    if (leads.length === 0) {
      return (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">No referrals yet</p>
              <Button onClick={() => navigate('/submit-referral')}>
                <Plus className="w-4 h-4 mr-2" /> Submit Your First Referral
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    if (leadsView === 'kanban') {
      return (
        <LeadsKanban
          leads={leads}
          statuses={statuses}
          onOpenLead={(lead) => setSelectedLead(lead as Lead)}
          onUpdateStatus={() => {}}
        />
      );
    }
    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map(lead => (
                <TableRow key={lead.id} className="cursor-pointer" onClick={() => setSelectedLead(lead)}>
                  <TableCell className="font-medium">{lead.first_name} {lead.last_name}</TableCell>
                  <TableCell>{lead.loan_purpose || '—'}</TableCell>
                  <TableCell>{lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : '—'}</TableCell>
                  <TableCell><StatusBadge status={lead.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(lead.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); fetchNotes(lead.id); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>{selectedLead?.first_name} {selectedLead?.last_name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex gap-2 flex-wrap">
                            {selectedLead && <StatusBadge status={selectedLead.status} />}
                            {selectedLead?.loan_purpose && (
                              <span className="text-sm text-muted-foreground">{selectedLead.loan_purpose}</span>
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Broker Notes</h4>
                            <ScrollArea className="h-48">
                              {notes.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No updates yet</p>
                              ) : (
                                <div className="space-y-3">
                                  {notes.map(note => (
                                    <div key={note.id} className="bg-muted rounded-lg p-3">
                                      <p className="text-sm">{note.content}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {format(new Date(note.created_at), 'dd MMM yyyy, HH:mm')}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </ScrollArea>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  function renderMyLeads() {
    return (
      <div className="space-y-4">
        {renderLeadsHeader()}
        {renderLeadsContent()}
      </div>
    );
  }
}
