import { useState, useMemo } from 'react';
import { Company } from '@/components/CompanyManagement';
import { ReferrerProfileData } from '@/components/ReferrerProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/StatusBadge';
import { LeadStatus } from '@/hooks/useLeadStatuses';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Building2, TrendingUp, DollarSign, Users, BarChart3 } from 'lucide-react';

interface Lead {
  id: string;
  referral_partner_id: string | null;
  first_name: string;
  last_name: string;
  loan_amount: number | null;
  status: string;
  created_at: string;
}

interface ReferrerReportsProps {
  leads: Lead[];
  referrers: ReferrerProfileData[];
  companies: Company[];
  statuses: LeadStatus[];
  selectedReferrerId?: string | null;
}

export function ReferrerReports({ leads, referrers, companies, statuses, selectedReferrerId }: ReferrerReportsProps) {
  const [viewBy, setViewBy] = useState<'company' | 'referrer'>(selectedReferrerId ? 'referrer' : 'company');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedReferrer, setSelectedReferrer] = useState<string>(selectedReferrerId || 'all');

  // Filter leads
  const relevantLeads = useMemo(() => {
    if (viewBy === 'company' && selectedCompany !== 'all') {
      const companyReferrerIds = referrers.filter(r => r.company_id === selectedCompany).map(r => r.user_id);
      return leads.filter(l => l.referral_partner_id && companyReferrerIds.includes(l.referral_partner_id));
    }
    if (viewBy === 'referrer' && selectedReferrer !== 'all') {
      return leads.filter(l => l.referral_partner_id === selectedReferrer);
    }
    return leads;
  }, [leads, referrers, viewBy, selectedCompany, selectedReferrer]);

  // Stats
  const totalLeads = relevantLeads.length;
  const settledLeads = relevantLeads.filter(l => l.status === 'settled');
  const conversionRate = totalLeads > 0 ? Math.round((settledLeads.length / totalLeads) * 100) : 0;
  const totalLoanValue = relevantLeads.reduce((sum, l) => sum + (l.loan_amount || 0), 0);
  const settledValue = settledLeads.reduce((sum, l) => sum + (l.loan_amount || 0), 0);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    relevantLeads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return statuses.map(s => ({
      name: s.label,
      value: counts[s.name] || 0,
      color: s.color,
    })).filter(s => s.value > 0);
  }, [relevantLeads, statuses]);

  // Monthly trends (last 6 months)
  const monthlyTrends = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthLeads = relevantLeads.filter(l => {
        const d = new Date(l.created_at);
        return isWithinInterval(d, { start, end });
      });
      const monthSettled = monthLeads.filter(l => l.status === 'settled');
      months.push({
        month: format(date, 'MMM yyyy'),
        leads: monthLeads.length,
        settled: monthSettled.length,
        value: monthLeads.reduce((s, l) => s + (l.loan_amount || 0), 0),
      });
    }
    return months;
  }, [relevantLeads]);

  // Per-referrer table for company view
  const referrerTable = useMemo(() => {
    if (viewBy !== 'company' || selectedCompany === 'all') return [];
    const companyReferrers = referrers.filter(r => r.company_id === selectedCompany);
    return companyReferrers.map(r => {
      const rLeads = leads.filter(l => l.referral_partner_id === r.user_id);
      const rSettled = rLeads.filter(l => l.status === 'settled');
      return {
        name: r.full_name || 'Unnamed',
        leads: rLeads.length,
        settled: rSettled.length,
        rate: rLeads.length > 0 ? Math.round((rSettled.length / rLeads.length) * 100) : 0,
        value: rLeads.reduce((s, l) => s + (l.loan_amount || 0), 0),
      };
    });
  }, [viewBy, selectedCompany, referrers, leads]);

  const label = viewBy === 'company'
    ? (selectedCompany !== 'all' ? companies.find(c => c.id === selectedCompany)?.name : 'All Companies')
    : (selectedReferrer !== 'all' ? referrers.find(r => r.user_id === selectedReferrer)?.full_name : 'All Referrers');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold">Reports</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={viewBy} onValueChange={(v: 'company' | 'referrer') => setViewBy(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="company">By Company</SelectItem>
            <SelectItem value="referrer">By Referrer</SelectItem>
          </SelectContent>
        </Select>

        {viewBy === 'company' ? (
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-64"><Building2 className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Select value={selectedReferrer} onValueChange={setSelectedReferrer}>
            <SelectTrigger className="w-64"><Users className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Referrers</SelectItem>
              {referrers.map(r => <SelectItem key={r.user_id} value={r.user_id}>{r.full_name || r.email || 'Unnamed'}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: totalLeads, icon: Users },
          { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp },
          { label: 'Total Loan Value', value: `$${totalLoanValue.toLocaleString()}`, icon: DollarSign },
          { label: 'Settled Value', value: `$${settledValue.toLocaleString()}`, icon: BarChart3 },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly Leads — {label}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="leads" name="All Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="settled" name="Settled" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            {statusBreakdown.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No leads to display</p>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={2}>
                      {statusBreakdown.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
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

      {/* Per-referrer breakdown (company view) */}
      {viewBy === 'company' && selectedCompany !== 'all' && referrerTable.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Individual Referrer Performance</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Settled</TableHead>
                  <TableHead className="text-right">Conversion</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrerTable.map(r => (
                  <TableRow key={r.name}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{r.leads}</TableCell>
                    <TableCell className="text-right">{r.settled}</TableCell>
                    <TableCell className="text-right">{r.rate}%</TableCell>
                    <TableCell className="text-right">${r.value.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
