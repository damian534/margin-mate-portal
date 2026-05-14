import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, ClipboardList, CheckCircle2, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';

type Period = 'this_month' | 'last_month' | 'cytd' | 'fytd' | 'custom';
type Metric = 'lodged' | 'approved' | 'settled';

interface PipelineLead {
  id: string;
  first_name: string;
  last_name: string;
  opportunity_name?: string | null;
  loan_amount: number | null;
  lodged_date?: string | null;
  approved_date?: string | null;
  settled_date?: string | null;
  assigned_to?: string | null;
  referral_partner_id?: string | null;
}

function getPeriodRange(period: Period, customFrom: string, customTo: string): { from: Date; to: Date; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (period === 'this_month') {
    return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0, 23, 59, 59), label: format(now, 'MMMM yyyy') };
  }
  if (period === 'last_month') {
    return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0, 23, 59, 59), label: format(new Date(y, m - 1, 1), 'MMMM yyyy') };
  }
  if (period === 'cytd') {
    return { from: new Date(y, 0, 1), to: now, label: `Calendar Year ${y}` };
  }
  if (period === 'fytd') {
    const fyStart = m >= 6 ? y : y - 1;
    return { from: new Date(fyStart, 6, 1), to: new Date(fyStart + 1, 5, 30, 23, 59, 59), label: `FY${String(fyStart + 1).slice(-2)} (Jul ${fyStart} – Jun ${fyStart + 1})` };
  }
  // custom
  const from = customFrom ? new Date(customFrom) : new Date(y, 0, 1);
  const to = customTo ? new Date(customTo + 'T23:59:59') : now;
  return { from, to, label: `${format(from, 'd MMM yyyy')} – ${format(to, 'd MMM yyyy')}` };
}

const METRIC_CONFIG: Record<Metric, { label: string; key: 'lodged_date' | 'approved_date' | 'settled_date'; icon: any; color: string }> = {
  lodged: { label: 'Lodged', key: 'lodged_date', icon: ClipboardList, color: 'hsl(280, 60%, 55%)' },
  approved: { label: 'Approved', key: 'approved_date', icon: CheckCircle2, color: 'hsl(38, 92%, 50%)' },
  settled: { label: 'Settled', key: 'settled_date', icon: DollarSign, color: 'hsl(152, 60%, 42%)' },
};

function exportCsv(rows: PipelineLead[], metric: Metric, getReferrerName?: (id: string | null) => string | null) {
  const cfg = METRIC_CONFIG[metric];
  const header = ['Date', 'Client', 'Opportunity', 'Loan Amount', 'Referrer'];
  const lines = [header.join(',')];
  rows.forEach(l => {
    const date = (l as any)[cfg.key] ? format(parseISO((l as any)[cfg.key]), 'yyyy-MM-dd') : '';
    const client = `${l.first_name} ${l.last_name}`.replace(/,/g, ' ');
    const opp = (l.opportunity_name || '').replace(/,/g, ' ');
    const amt = l.loan_amount ?? '';
    const ref = (getReferrerName?.(l.referral_partner_id ?? null) || '').replace(/,/g, ' ');
    lines.push([date, client, opp, amt, ref].join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cfg.label.toLowerCase()}-deals-${format(new Date(), 'yyyyMMdd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function PipelineReport({
  leads,
  getReferrerName,
}: {
  leads: PipelineLead[];
  getReferrerName?: (id: string | null) => string | null;
}) {
  const [period, setPeriod] = useState<Period>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [activeMetric, setActiveMetric] = useState<Metric>('lodged');
  const [dialogMetric, setDialogMetric] = useState<Metric | null>(null);

  const range = useMemo(() => getPeriodRange(period, customFrom, customTo), [period, customFrom, customTo]);

  const buckets = useMemo(() => {
    const inRange = (d?: string | null) => {
      if (!d) return false;
      const dt = new Date(d);
      return dt >= range.from && dt <= range.to;
    };
    const make = (key: 'lodged_date' | 'approved_date' | 'settled_date') => {
      const arr = leads.filter(l => inRange(l[key]));
      const volume = arr.reduce((s, l) => s + (l.loan_amount || 0), 0);
      return { rows: arr.sort((a, b) => (b[key] || '').localeCompare(a[key] || '')), count: arr.length, volume };
    };
    return {
      lodged: make('lodged_date'),
      approved: make('approved_date'),
      settled: make('settled_date'),
    };
  }, [leads, range]);

  const current = buckets[activeMetric];
  const cfg = METRIC_CONFIG[activeMetric];

  const dialogData = dialogMetric ? buckets[dialogMetric] : null;
  const dialogCfg = dialogMetric ? METRIC_CONFIG[dialogMetric] : null;

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
                <SelectItem value="cytd">Calendar Year (YTD)</SelectItem>
                <SelectItem value="fytd">Financial Year (Jul–Jun)</SelectItem>
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
          <div className="ml-auto text-sm text-muted-foreground">
            Showing: <span className="font-medium text-foreground">{range.label}</span>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['lodged', 'approved', 'settled'] as Metric[]).map(m => {
          const c = METRIC_CONFIG[m];
          const b = buckets[m];
          const Icon = c.icon;
          const isActive = activeMetric === m;
          return (
            <div
              key={m}
              onClick={() => setActiveMetric(m)}
              className={`cursor-pointer text-left rounded-xl border p-4 transition-all ${isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/30'}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground">{c.label}</div>
                <Icon className="w-4 h-4" style={{ color: c.color }} />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDialogMetric(m);
                }}
                className="mt-2 text-2xl font-semibold tabular-nums hover:underline text-foreground"
              >
                {b.count}
              </button>
              <div className="text-sm text-muted-foreground tabular-nums">${b.volume.toLocaleString()}</div>
            </div>
          );
        })}
      </div>

      {/* Detail table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold">{cfg.label} deals · {range.label}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => exportCsv(current.rows, activeMetric, getReferrerName)} disabled={current.rows.length === 0}>
            <FileDown className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {current.rows.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">No {cfg.label.toLowerCase()} deals in this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{cfg.label} Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Opportunity</TableHead>
                  <TableHead className="text-right">Loan Amount</TableHead>
                  <TableHead>Referrer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.rows.map(l => {
                  const d = (l as any)[cfg.key] as string | null;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{d ? format(parseISO(d), 'd MMM yyyy') : '—'}</TableCell>
                      <TableCell className="font-medium">{l.first_name} {l.last_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.opportunity_name || '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{l.loan_amount ? `$${l.loan_amount.toLocaleString()}` : '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{getReferrerName?.(l.referral_partner_id ?? null) || '—'}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right tabular-nums">${current.volume.toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{current.count} deals</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}