import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, Users, TrendingUp, DollarSign } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Period = 'this_month' | 'last_month' | 'last_6' | 'last_12' | 'this_fy' | 'last_fy' | 'custom';

interface ReportLead {
  id: string;
  first_name: string;
  last_name: string;
  opportunity_name?: string | null;
  loan_amount: number | null;
  status: string;
  source: string | null;
  created_at: string;
  referral_partner_id?: string | null;
}

interface LeadSource {
  name: string;
  label: string;
}

function getPeriodRange(period: Period, customFrom: string, customTo: string): { from: Date; to: Date; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (period === 'this_month') {
    return { from: startOfMonth(now), to: endOfMonth(now), label: format(now, 'MMMM yyyy') };
  }
  if (period === 'last_month') {
    const prev = subMonths(now, 1);
    return { from: startOfMonth(prev), to: endOfMonth(prev), label: format(prev, 'MMMM yyyy') };
  }
  if (period === 'last_6') {
    return { from: startOfMonth(subMonths(now, 5)), to: endOfMonth(now), label: `Last 6 months (${format(subMonths(now, 5), 'MMM yyyy')} – ${format(now, 'MMM yyyy')})` };
  }
  if (period === 'last_12') {
    return { from: startOfMonth(subMonths(now, 11)), to: endOfMonth(now), label: `Last 12 months (${format(subMonths(now, 11), 'MMM yyyy')} – ${format(now, 'MMM yyyy')})` };
  }
  if (period === 'this_fy') {
    const fyStart = m >= 6 ? y : y - 1;
    return { from: new Date(fyStart, 6, 1), to: new Date(fyStart + 1, 5, 30, 23, 59, 59), label: `FY${String(fyStart + 1).slice(-2)} (Jul ${fyStart} – Jun ${fyStart + 1})` };
  }
  if (period === 'last_fy') {
    const fyStart = (m >= 6 ? y : y - 1) - 1;
    return { from: new Date(fyStart, 6, 1), to: new Date(fyStart + 1, 5, 30, 23, 59, 59), label: `FY${String(fyStart + 1).slice(-2)} (Jul ${fyStart} – Jun ${fyStart + 1})` };
  }
  const from = customFrom ? new Date(customFrom) : startOfMonth(subMonths(now, 11));
  const to = customTo ? new Date(customTo + 'T23:59:59') : now;
  return { from, to, label: `${format(from, 'd MMM yyyy')} – ${format(to, 'd MMM yyyy')}` };
}

interface MonthBucket {
  key: string; // yyyy-MM
  label: string;
  count: number;
  volume: number;
  settled: number;
  lost: number;
  leads: ReportLead[];
}

function exportMonthlyCsv(buckets: MonthBucket[], rangeLabel: string) {
  const lines = [['Month', 'New Leads', 'Total Loan Amount', 'Settled', 'Lost'].join(',')];
  buckets.forEach(b => lines.push([b.label, String(b.count), String(b.volume), String(b.settled), String(b.lost)].join(',')));
  const total = buckets.reduce((s, b) => s + b.count, 0);
  const totalVol = buckets.reduce((s, b) => s + b.volume, 0);
  lines.push(['Total', String(total), String(totalVol), String(buckets.reduce((s, b) => s + b.settled, 0)), String(buckets.reduce((s, b) => s + b.lost, 0))].join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lead-flow-${format(new Date(), 'yyyyMMdd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LeadsReport({
  leads,
  leadSources,
  getReferrerName,
  onLeadUpdated,
}: {
  leads: ReportLead[];
  leadSources?: LeadSource[];
  getReferrerName?: (id: string | null) => string | null;
  onLeadUpdated?: () => void;
}) {
  const [period, setPeriod] = useState<Period>('last_12');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<MonthBucket | null>(null);
  const [selectedSource, setSelectedSource] = useState<{ raw: string; label: string } | null>(null);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);

  const selectedSourceLeads = useMemo(() => {
    if (!selectedSource) return [];
    return buckets
      .flatMap(b => b.leads)
      .filter(l => (l.source || 'unknown') === selectedSource.raw)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [buckets, selectedSource]);

  const changeLeadSource = async (lead: ReportLead, newSource: string) => {
    if (newSource === (lead.source || '')) return;
    setUpdatingLeadId(lead.id);
    const { error } = await supabase.from('leads').update({ source: newSource } as any).eq('id', lead.id);
    setUpdatingLeadId(null);
    if (error) {
      toast.error('Could not update the lead source');
      return;
    }
    toast.success(`Source updated for ${lead.first_name} ${lead.last_name}`);
    onLeadUpdated?.();
  };

  const range = useMemo(() => getPeriodRange(period, customFrom, customTo), [period, customFrom, customTo]);

  const buckets = useMemo(() => {
    // Build a bucket for every month in range (even empty ones)
    const map = new Map<string, MonthBucket>();
    let cursor = startOfMonth(range.from);
    while (cursor <= range.to) {
      const key = format(cursor, 'yyyy-MM');
      map.set(key, { key, label: format(cursor, 'MMM yyyy'), count: 0, volume: 0, settled: 0, lost: 0, leads: [] });
      cursor = addMonths(cursor, 1);
    }
    leads.forEach(l => {
      const dt = new Date(l.created_at);
      if (dt < range.from || dt > range.to) return;
      const key = format(dt, 'yyyy-MM');
      const b = map.get(key);
      if (!b) return;
      b.count += 1;
      b.volume += l.loan_amount || 0;
      if (l.status === 'settled') b.settled += 1;
      if (l.status === 'lost') b.lost += 1;
      b.leads.push(l);
    });
    return Array.from(map.values());
  }, [leads, range]);

  const totals = useMemo(() => ({
    count: buckets.reduce((s, b) => s + b.count, 0),
    volume: buckets.reduce((s, b) => s + b.volume, 0),
    settled: buckets.reduce((s, b) => s + b.settled, 0),
  }), [buckets]);

  const monthlyAvg = buckets.length ? totals.count / buckets.length : 0;

  const sourceBreakdown = useMemo(() => {
    const map = new Map<string, { raw: string; label: string; count: number; volume: number }>();
    buckets.forEach(b => b.leads.forEach(l => {
      const raw = l.source || 'unknown';
      const label = leadSources?.find(s => s.name === raw)?.label || (raw === 'unknown' ? 'No source' : raw);
      const cur = map.get(raw) || { raw, label, count: 0, volume: 0 };
      cur.count += 1;
      cur.volume += l.loan_amount || 0;
      map.set(raw, cur);
    }));
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [buckets, leadSources]);

  const referrerBreakdown = useMemo(() => {
    const map = new Map<string, { label: string; count: number; volume: number }>();
    buckets.forEach(b => b.leads.forEach(l => {
      const label = getReferrerName?.(l.referral_partner_id ?? null) || 'Direct / no referrer';
      const cur = map.get(label) || { label, count: 0, volume: 0 };
      cur.count += 1;
      cur.volume += l.loan_amount || 0;
      map.set(label, cur);
    }));
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [buckets, getReferrerName]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Period</Label>
            <Select value={period} onValueChange={v => setPeriod(v as Period)}>
              <SelectTrigger className="w-[200px] h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_6">Last 6 Months</SelectItem>
                <SelectItem value="last_12">Last 12 Months</SelectItem>
                <SelectItem value="this_fy">This Financial Year</SelectItem>
                <SelectItem value="last_fy">Last Financial Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {period === 'custom' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input type="date" className="w-[160px] h-9 text-sm" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input type="date" className="w-[160px] h-9 text-sm" value={customTo} onChange={e => setCustomTo(e.target.value)} />
              </div>
            </>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Showing: <span className="font-medium text-foreground">{range.label}</span></span>
            <Button variant="outline" size="sm" onClick={() => exportMonthlyCsv(buckets, range.label)} disabled={totals.count === 0}>
              <FileDown className="w-3.5 h-3.5 mr-1.5" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">New Leads</div>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{totals.count}</div>
            <div className="text-sm text-muted-foreground tabular-nums">{monthlyAvg.toFixed(1)} per month avg</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Total Loan Amount</div>
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">${totals.volume.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground tabular-nums">{totals.count ? `$${Math.round(totals.volume / totals.count).toLocaleString()} avg per lead` : '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Settled from these leads</div>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{totals.settled}</div>
            <div className="text-sm text-muted-foreground tabular-nums">{totals.count ? `${Math.round((totals.settled / totals.count) * 100)}% conversion` : '—'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">New leads per month · {range.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any, name: any) => [name === 'count' ? `${value} leads` : `$${Number(value).toLocaleString()}`, name === 'count' ? 'New leads' : 'Loan amount']}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => {
                  const b = buckets.find(x => x.key === data?.key);
                  if (b && b.count > 0) setSelectedMonth(b);
                }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Click a bar or a month row to see the individual leads.</p>
        </CardContent>
      </Card>

      {/* Monthly table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Month by month</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">New Leads</TableHead>
                <TableHead className="text-right">Loan Amount</TableHead>
                <TableHead className="text-right">Settled</TableHead>
                <TableHead className="text-right">Lost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...buckets].reverse().map(b => (
                <TableRow key={b.key} className={b.count > 0 ? 'cursor-pointer hover:bg-muted/50' : ''} onClick={() => b.count > 0 && setSelectedMonth(b)}>
                  <TableCell className="font-medium">{b.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.count}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.volume ? `$${b.volume.toLocaleString()}` : '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.settled || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.lost || '—'}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/40 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right tabular-nums">{totals.count}</TableCell>
                <TableCell className="text-right tabular-nums">${totals.volume.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.settled}</TableCell>
                <TableCell className="text-right tabular-nums">{buckets.reduce((s, b) => s + b.lost, 0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">By lead source</CardTitle>
          </CardHeader>
          <CardContent>
            {sourceBreakdown.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No leads in this period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Loan Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourceBreakdown.map(s => (
                    <TableRow key={s.raw} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedSource({ raw: s.raw, label: s.label })}>
                      <TableCell className="font-medium text-primary underline-offset-2 hover:underline">{s.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.count}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.volume ? `$${s.volume.toLocaleString()}` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">By referrer</CardTitle>
          </CardHeader>
          <CardContent>
            {referrerBreakdown.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No leads in this period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referrer</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Loan Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrerBreakdown.map(r => (
                    <TableRow key={r.label}>
                      <TableCell className="font-medium">{r.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.volume ? `$${r.volume.toLocaleString()}` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Month drill-down dialog */}
      <Dialog open={selectedMonth !== null} onOpenChange={(open) => !open && setSelectedMonth(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New leads · {selectedMonth?.label}</DialogTitle>
            <DialogDescription>{selectedMonth?.count} leads · ${selectedMonth?.volume.toLocaleString()} total loan amount</DialogDescription>
          </DialogHeader>
          {selectedMonth && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead className="text-right">Loan Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...selectedMonth.leads].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{format(parseISO(l.created_at), 'd MMM yyyy')}</TableCell>
                    <TableCell className="font-medium">{l.first_name} {l.last_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{leadSources?.find(s => s.name === l.source)?.label || l.source || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{getReferrerName?.(l.referral_partner_id ?? null) || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.loan_amount ? `$${l.loan_amount.toLocaleString()}` : '—'}</TableCell>
                    <TableCell className="text-sm capitalize">{l.status.replace(/_/g, ' ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Source drill-down dialog — review & fix lead sources */}
      <Dialog open={selectedSource !== null} onOpenChange={(open) => !open && setSelectedSource(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSource?.label} · {selectedSourceLeads.length} leads</DialogTitle>
            <DialogDescription>Review these leads and change the source on any that are miscategorised.</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Loan Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[200px]">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedSourceLeads.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm">{format(parseISO(l.created_at), 'd MMM yyyy')}</TableCell>
                  <TableCell className="font-medium">{l.first_name} {l.last_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.loan_amount ? `$${l.loan_amount.toLocaleString()}` : '—'}</TableCell>
                  <TableCell className="text-sm capitalize">{l.status.replace(/_/g, ' ')}</TableCell>
                  <TableCell>
                    <Select
                      value={l.source || ''}
                      disabled={updatingLeadId === l.id}
                      onValueChange={(v) => changeLeadSource(l, v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select source..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(leadSources || []).map(s => (
                          <SelectItem key={s.name} value={s.name}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
