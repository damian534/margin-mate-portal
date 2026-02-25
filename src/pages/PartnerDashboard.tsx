import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLeadStatuses } from '@/hooks/useLeadStatuses';
import { SAMPLE_LEADS, SAMPLE_NOTES } from '@/lib/sample-data';
import { AppHeader } from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { LeadsKanban } from '@/components/LeadsKanban';
import { CompanyLeaderboard } from '@/components/company/CompanyLeaderboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, TrendingUp, Clock, CheckCircle, List, Columns, Building2, Users, DollarSign, BarChart3, Crown } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  loan_amount: number | null;
  loan_purpose: string | null;
  status: string;
  source?: string | null;
  created_at: string;
  referral_partner_id: string | null;
  referrer_commission?: number | null;
  referrer_commission_paid?: boolean | null;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
}

interface CompanyAgent {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
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
  const [isDirector, setIsDirector] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [companyAgents, setCompanyAgents] = useState<CompanyAgent[]>([]);
  const [companyLeads, setCompanyLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState('my-leads');

  useEffect(() => {
    if (isPreviewMode) {
      setLeads(SAMPLE_LEADS as Lead[]);
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
      setCompanyName((profile as any).company_name || 'My Company');

      // Fetch all agents in same company
      const { data: agents } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email')
        .eq('company_id', (profile as any).company_id);

      const agentsList = (agents || []).filter(a => a.user_id) as CompanyAgent[];
      setCompanyAgents(agentsList);

      // Fetch all leads for company agents (director RLS policy allows this)
      const agentIds = agentsList.map(a => a.user_id).filter(Boolean);
      if (agentIds.length > 0) {
        const { data: cLeads } = await supabase
          .from('leads')
          .select('*')
          .in('referral_partner_id', agentIds)
          .order('created_at', { ascending: false });
        setCompanyLeads((cLeads as Lead[]) || []);
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

  const openLead = (lead: Lead) => {
    setSelectedLead(lead);
    fetchNotes(lead.id);
  };

  const stats = {
    total: leads.length,
    active: leads.filter(l => !['settled', 'lost'].includes(l.status)).length,
    settled: leads.filter(l => l.status === 'settled').length,
  };

  const companyStats = useMemo(() => ({
    total: companyLeads.length,
    active: companyLeads.filter(l => !['settled', 'lost'].includes(l.status)).length,
    settled: companyLeads.filter(l => l.status === 'settled').length,
    volume: companyLeads.filter(l => l.status === 'settled').reduce((s, l) => s + (l.loan_amount || 0), 0),
  }), [companyLeads]);

  // Status breakdown for company
  const companyStatusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    companyLeads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return statuses.map(s => ({ name: s.label, value: counts[s.name] || 0, color: s.color })).filter(s => s.value > 0);
  }, [companyLeads, statuses]);

  // Monthly trends for company
  const companyMonthlyTrends = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const s = startOfMonth(date);
      const e = endOfMonth(date);
      const ml = companyLeads.filter(l => isWithinInterval(new Date(l.created_at), { start: s, end: e }));
      months.push({ month: format(date, 'MMM'), leads: ml.length, settled: ml.filter(l => l.status === 'settled').length });
    }
    return months;
  }, [companyLeads]);

  const getAgentName = (partnerId: string | null) => {
    if (!partnerId) return '—';
    const agent = companyAgents.find(a => a.user_id === partnerId);
    return agent?.full_name || '—';
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold">
              {isDirector ? (
                <span className="flex items-center gap-2">
                  <Crown className="w-7 h-7 text-primary" />
                  {companyName} Dashboard
                </span>
              ) : 'My Referrals'}
            </h1>
            <p className="text-muted-foreground">
              {isDirector ? 'Director view — see all agent activity' : 'Track all your submitted leads'}
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

        {isDirector ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="my-leads">My Leads</TabsTrigger>
              <TabsTrigger value="company" className="gap-1.5"><Building2 className="w-4 h-4" /> Company</TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-1.5"><TrendingUp className="w-4 h-4" /> Leaderboard</TabsTrigger>
            </TabsList>

            <TabsContent value="my-leads" className="mt-4">
              {renderMyLeads()}
            </TabsContent>

            <TabsContent value="company" className="space-y-6 mt-4">
              {/* Company KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Agents', value: companyAgents.length, icon: Users },
                  { label: 'Total Leads', value: companyStats.total, icon: TrendingUp },
                  { label: 'Settled', value: companyStats.settled, icon: CheckCircle },
                  { label: 'Volume', value: `$${companyStats.volume.toLocaleString()}`, icon: DollarSign },
                ].map(s => (
                  <Card key={s.label}>
                    <CardContent className="pt-5 pb-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <s.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xl font-bold">{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Charts */}
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Monthly Activity</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={companyMonthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} />
                        <Bar dataKey="leads" name="Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="settled" name="Settled" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Pipeline Status</CardTitle></CardHeader>
                  <CardContent>
                    {companyStatusBreakdown.length === 0 ? (
                      <p className="text-muted-foreground text-center py-12">No leads</p>
                    ) : (
                      <div className="flex items-center gap-6">
                        <ResponsiveContainer width="50%" height={200}>
                          <PieChart>
                            <Pie data={companyStatusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={2}>
                              {companyStatusBreakdown.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 flex-1">
                          {companyStatusBreakdown.map(s => (
                            <div key={s.name} className="flex items-center gap-2 text-sm">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                              <span className="flex-1">{s.name}</span>
                              <span className="font-medium">{s.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* All company leads table */}
              <Card>
                <CardHeader><CardTitle className="text-base">All Company Leads ({companyLeads.length})</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companyLeads.map(lead => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">{lead.first_name} {lead.last_name}</TableCell>
                          <TableCell className="text-sm">{getAgentName(lead.referral_partner_id || null)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{lead.loan_purpose || '—'}</TableCell>
                          <TableCell>{lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : '—'}</TableCell>
                          <TableCell><StatusBadge status={lead.status} /></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(lead.created_at), 'dd MMM yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leaderboard" className="mt-4">
              <CompanyLeaderboard leads={companyLeads} agents={companyAgents} />
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
