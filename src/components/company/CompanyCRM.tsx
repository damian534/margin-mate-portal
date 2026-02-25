import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLeadStatuses } from '@/hooks/useLeadStatuses';
import { Company } from '@/components/CompanyManagement';
import { ReferrerProfileData } from '@/components/ReferrerProfile';
import { CompanyLeaderboard } from './CompanyLeaderboard';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfYear, subMonths, isWithinInterval, startOfQuarter, endOfQuarter } from 'date-fns';
import {
  ArrowLeft, Building2, Users, TrendingUp, DollarSign, BarChart3,
  Mail, Phone, Trophy, CheckCircle, Clock, UserPlus, Link2, Crown,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
  source: string | null;
  created_at: string;
  referrer_commission: number | null;
  referrer_commission_paid: boolean | null;
  company_commission: number | null;
  company_commission_paid: boolean | null;
}

type TimePeriod = 'current_month' | 'previous_month' | 'current_quarter' | 'ytd' | 'all_time';

interface CompanyCRMProps {
  company: Company;
  leads: Lead[];
  referrers: ReferrerProfileData[];
  contacts: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    type: string;
  }>;
  onBack: () => void;
  onOpenLead?: (lead: Lead) => void;
  isPreviewMode?: boolean;
}

export function CompanyCRM({ company, leads, referrers, contacts, onBack, onOpenLead, isPreviewMode }: CompanyCRMProps) {
  const { user } = useAuth();
  const { statuses } = useLeadStatuses();
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState<TimePeriod>('all_time');

  // Get agents for this company
  const companyAgents = useMemo(() => {
    const agents: Array<{ id: string; user_id: string; full_name: string | null; email: string | null; phone: string | null; source: 'profile' | 'contact'; isDirector?: boolean }> = [];
    const seen = new Set<string>();

    referrers.forEach(r => {
      const matchById = r.company_id === company.id;
      const matchByName = r.company_name && r.company_name.toLowerCase() === company.name.toLowerCase();
      if (matchById || matchByName) {
        const key = r.email?.toLowerCase() || r.id;
        if (!seen.has(key)) {
          seen.add(key);
          agents.push({
            id: r.id,
            user_id: r.user_id,
            full_name: r.full_name,
            email: r.email,
            phone: r.phone,
            source: 'profile',
            isDirector: (r as any).is_director || false,
          });
        }
      }
    });

    contacts.forEach(c => {
      if (c.company && c.company.toLowerCase() === company.name.toLowerCase() && c.type === 'referrer') {
        const key = c.email?.toLowerCase() || c.id;
        if (!seen.has(key)) {
          seen.add(key);
          agents.push({
            id: c.id,
            user_id: `contact-${c.id}`,
            full_name: `${c.first_name} ${c.last_name}`.trim(),
            email: c.email,
            phone: c.phone,
            source: 'contact',
          });
        }
      }
    });

    return agents;
  }, [company, referrers, contacts]);

  const agentUserIds = useMemo(() => new Set(companyAgents.map(a => a.user_id)), [companyAgents]);

  // Get all leads from this company's agents
  const companyLeads = useMemo(() => {
    return leads.filter(l => l.referral_partner_id && agentUserIds.has(l.referral_partner_id));
  }, [leads, agentUserIds]);

  // Time-filtered leads
  const filteredLeads = useMemo(() => {
    if (period === 'all_time') return companyLeads;
    const now = new Date();
    let start: Date, end: Date;
    if (period === 'current_month') { start = startOfMonth(now); end = endOfMonth(now); }
    else if (period === 'previous_month') { const prev = subMonths(now, 1); start = startOfMonth(prev); end = endOfMonth(prev); }
    else if (period === 'current_quarter') { start = startOfQuarter(now); end = endOfQuarter(now); }
    else { start = startOfYear(now); end = now; }
    return companyLeads.filter(l => isWithinInterval(new Date(l.created_at), { start, end }));
  }, [companyLeads, period]);

  // KPIs
  const totalLeads = filteredLeads.length;
  const settledLeads = filteredLeads.filter(l => l.status === 'settled');
  const activeLeads = filteredLeads.filter(l => !['settled', 'lost'].includes(l.status));
  const conversionRate = totalLeads > 0 ? Math.round((settledLeads.length / totalLeads) * 100) : 0;
  const totalLoanVolume = filteredLeads.reduce((s, l) => s + (l.loan_amount || 0), 0);
  const settledVolume = settledLeads.reduce((s, l) => s + (l.loan_amount || 0), 0);

  // Commission totals
  const totalReferrerComm = filteredLeads.reduce((s, l) => s + (l.referrer_commission || 0), 0);
  const paidReferrerComm = filteredLeads.filter(l => l.referrer_commission_paid).reduce((s, l) => s + (l.referrer_commission || 0), 0);
  const totalCompanyComm = filteredLeads.reduce((s, l) => s + (l.company_commission || 0), 0);
  const paidCompanyComm = filteredLeads.filter(l => l.company_commission_paid).reduce((s, l) => s + (l.company_commission || 0), 0);
  const totalOutstanding = (totalReferrerComm - paidReferrerComm) + (totalCompanyComm - paidCompanyComm);

  // Status breakdown for chart
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return statuses.map(s => ({ name: s.label, value: counts[s.name] || 0, color: s.color })).filter(s => s.value > 0);
  }, [filteredLeads, statuses]);

  // Monthly trends
  const monthlyTrends = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const s = startOfMonth(date);
      const e = endOfMonth(date);
      const ml = companyLeads.filter(l => isWithinInterval(new Date(l.created_at), { start: s, end: e }));
      months.push({
        month: format(date, 'MMM'),
        leads: ml.length,
        settled: ml.filter(l => l.status === 'settled').length,
        volume: ml.reduce((sum, l) => sum + (l.loan_amount || 0), 0),
      });
    }
    return months;
  }, [companyLeads]);

  // Per-agent performance for commissions tab
  const agentPerformance = useMemo(() => {
    return companyAgents.map(agent => {
      const agentLeads = filteredLeads.filter(l => l.referral_partner_id === agent.user_id);
      const settled = agentLeads.filter(l => l.status === 'settled');
      const comm = agentLeads.reduce((s, l) => s + (l.referrer_commission || 0), 0);
      const paid = agentLeads.filter(l => l.referrer_commission_paid).reduce((s, l) => s + (l.referrer_commission || 0), 0);
      return {
        ...agent,
        totalLeads: agentLeads.length,
        settledCount: settled.length,
        loanVolume: settled.reduce((s, l) => s + (l.loan_amount || 0), 0),
        commission: comm,
        paid,
        outstanding: comm - paid,
      };
    }).sort((a, b) => b.totalLeads - a.totalLeads);
  }, [companyAgents, filteredLeads]);

  const getAgentName = (partnerId: string | null) => {
    if (!partnerId) return '—';
    const agent = companyAgents.find(a => a.user_id === partnerId);
    return agent?.full_name || '—';
  };

  const toggleDirector = async (agentId: string, currentValue: boolean) => {
    if (isPreviewMode) { toast.success('Director status toggled (preview)'); return; }
    const { error } = await supabase.from('profiles').update({ is_director: !currentValue } as any).eq('id', agentId);
    if (error) { toast.error('Failed to update director status'); return; }
    toast.success(!currentValue ? 'Set as Director' : 'Removed Director status');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">{company.name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {company.address && <span>{company.address}</span>}
              {company.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{company.email}</span>}
              {company.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{company.phone}</span>}
            </div>
          </div>
        </div>
        <Select value={period} onValueChange={(v: TimePeriod) => setPeriod(v)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current_month">This Month</SelectItem>
            <SelectItem value="previous_month">Last Month</SelectItem>
            <SelectItem value="current_quarter">This Quarter</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
            <SelectItem value="all_time">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Agents', value: companyAgents.length, icon: Users, color: 'text-primary' },
          { label: 'Total Leads', value: totalLeads, icon: TrendingUp, color: 'text-primary' },
          { label: 'Settled', value: settledLeads.length, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Conversion', value: `${conversionRate}%`, icon: BarChart3, color: 'text-primary' },
          { label: 'Volume', value: `$${settledVolume.toLocaleString()}`, icon: DollarSign, color: 'text-green-600' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="w-4 h-4" /> Overview</TabsTrigger>
          <TabsTrigger value="agents" className="gap-1.5"><Users className="w-4 h-4" /> Agents</TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5"><TrendingUp className="w-4 h-4" /> Leads</TabsTrigger>
          <TabsTrigger value="commissions" className="gap-1.5"><DollarSign className="w-4 h-4" /> Commissions</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Monthly Trends */}
            <Card>
              <CardHeader><CardTitle className="text-base">Monthly Activity</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} />
                    <Bar dataKey="leads" name="Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="settled" name="Settled" fill="hsl(var(--success, 142 76% 36%))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Breakdown */}
            <Card>
              <CardHeader><CardTitle className="text-base">Pipeline Status</CardTitle></CardHeader>
              <CardContent>
                {statusBreakdown.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">No leads</p>
                ) : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={2}>
                          {statusBreakdown.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {statusBreakdown.map(s => (
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

          {/* Leaderboard */}
          <CompanyLeaderboard leads={companyLeads} agents={companyAgents} />
        </TabsContent>

        {/* AGENTS TAB */}
        <TabsContent value="agents" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-heading font-semibold">Agents ({companyAgents.length})</h3>
          </div>
          {companyAgents.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No agents linked to this company yet.</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {agentPerformance.map(agent => (
                <Card key={agent.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {(agent.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{agent.full_name || 'Unnamed'}</p>
                          {agent.isDirector && (
                            <Badge variant="secondary" className="gap-1 text-[10px]"><Crown className="w-3 h-3" />Director</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {agent.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{agent.email}</span>}
                          {agent.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{agent.phone}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm shrink-0">
                        <div className="text-center">
                          <p className="font-bold">{agent.totalLeads}</p>
                          <p className="text-[10px] text-muted-foreground">Leads</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-green-600">{agent.settledCount}</p>
                          <p className="text-[10px] text-muted-foreground">Settled</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">${agent.loanVolume.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Volume</p>
                        </div>
                        {agent.source === 'profile' && (
                          <div className="flex items-center gap-2 border-l pl-4">
                            <Label htmlFor={`dir-${agent.id}`} className="text-xs text-muted-foreground">Director</Label>
                            <Switch
                              id={`dir-${agent.id}`}
                              checked={agent.isDirector || false}
                              onCheckedChange={() => toggleDirector(agent.id, agent.isDirector || false)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* LEADS TAB */}
        <TabsContent value="leads" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-heading font-semibold">All Leads ({filteredLeads.length})</h3>
          </div>
          {filteredLeads.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No leads from this company's agents</CardContent></Card>
          ) : (
            <Card>
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
                    {filteredLeads.map(lead => (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => onOpenLead?.(lead)}
                      >
                        <TableCell className="font-medium">{lead.first_name} {lead.last_name}</TableCell>
                        <TableCell className="text-sm">{getAgentName(lead.referral_partner_id)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{lead.loan_purpose || '—'}</TableCell>
                        <TableCell>{lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : '—'}</TableCell>
                        <TableCell><StatusBadge status={lead.status} statuses={statuses} /></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{format(new Date(lead.created_at), 'dd MMM yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* COMMISSIONS TAB */}
        <TabsContent value="commissions" className="space-y-6 mt-4">
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-sm text-muted-foreground">Referrer Commissions</p>
                <p className="text-xl font-bold">${totalReferrerComm.toLocaleString()}</p>
                <div className="flex gap-3 mt-1 text-xs">
                  <span className="text-green-600">Paid: ${paidReferrerComm.toLocaleString()}</span>
                  <span className="text-orange-600">Owed: ${(totalReferrerComm - paidReferrerComm).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-sm text-muted-foreground">Company Commissions</p>
                <p className="text-xl font-bold">${totalCompanyComm.toLocaleString()}</p>
                <div className="flex gap-3 mt-1 text-xs">
                  <span className="text-green-600">Paid: ${paidCompanyComm.toLocaleString()}</span>
                  <span className="text-orange-600">Owed: ${(totalCompanyComm - paidCompanyComm).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-xl font-bold text-orange-600">${totalOutstanding.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-sm text-muted-foreground">Settled Volume</p>
                <p className="text-xl font-bold text-green-600">${settledVolume.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-agent breakdown */}
          <Card>
            <CardHeader><CardTitle className="text-base">Agent Commission Breakdown</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Settled</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentPerformance.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.full_name || 'Unnamed'}</TableCell>
                      <TableCell className="text-right">{a.totalLeads}</TableCell>
                      <TableCell className="text-right">{a.settledCount}</TableCell>
                      <TableCell className="text-right">${a.loanVolume.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${a.commission.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600">${a.paid.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-orange-600">${a.outstanding.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
