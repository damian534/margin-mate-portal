import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { currentFYStart, financialYearLabel, getLeadReportRange, type LeadReportPeriod } from '@/lib/leadReportPeriods';
import {
  cohortFunnel, isLodged, isPresented, isSettled, monthlyFunnels, rates, sourceMetrics,
  type MetricsLead, type SettlementDates,
} from '@/lib/businessMetrics';

type Stage = 'leads' | 'presented' | 'lodged' | 'settled';
const stageLabel: Record<Stage, string> = { leads: 'Leads', presented: 'Options presented', lodged: 'Lodged', settled: 'Settled' };

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-AU');
const pctFmt = (n: number) => `${n.toFixed(0)}%`;

export function BusinessMetrics({ leads, leadSources }: { leads: MetricsLead[]; leadSources?: { name: string; label: string }[] }) {
  const [period, setPeriod] = useState<LeadReportPeriod>('ytd');
  const [fyStart, setFyStart] = useState(currentFYStart());
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [settlements, setSettlements] = useState<SettlementDates>(new Map());
  const [drill, setDrill] = useState<{ title: string; stage: Stage; from: Date; to: Date; source?: string } | null>(null);

  useEffect(() => {
    supabase.from('settlements').select('lead_id, settlement_date').then(({ data }) => {
      const m: SettlementDates = new Map();
      (data || []).forEach((s: any) => { if (s.lead_id) m.set(s.lead_id, s.settlement_date); });
      setSettlements(m);
    });
  }, []);

  const range = useMemo(() => getLeadReportRange(period, customFrom, customTo, fyStart), [period, customFrom, customTo, fyStart]);
  const { from, to } = range;

  const funnel = useMemo(
    () => cohortFunnel(leads, settlements, from, to),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leads, settlements, range],
  );
  const r = rates(funnel);
  const months = useMemo(() => monthlyFunnels('cohort', leads, settlements, from, new Date() < to ? new Date() : to), [leads, settlements, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const sources = useMemo(() => sourceMetrics(leads, settlements, from, to), [leads, settlements, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const label = (raw: string) => leadSources?.find(s => s.name === raw)?.label || (raw === 'unknown' ? 'No source' : raw.replace(/_/g, ' '));

  const steps = [
    { name: 'Leads', value: funnel.leads, sub: money(funnel.leadVolume) },
    { name: 'Options presented', value: funnel.presented, rate: r.leadToPresented, rateLabel: 'of leads' },
    { name: 'Lodged', value: funnel.lodged, sub: money(funnel.lodgedVolume), rate: r.presentedToLodged, rateLabel: 'of options' },
    { name: 'Settled', value: funnel.settled, sub: money(funnel.settledVolume), rate: r.lodgedToSettled, rateLabel: 'of lodged' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-lg">Business Metrics — {range.label}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Leads that came in during the period, followed through to settlement.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={v => setPeriod(v as LeadReportPeriod)}>
            <SelectTrigger className="w-[190px] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="current_quarter">Current Quarter</SelectItem>
              <SelectItem value="q1">Q1 (Jul–Sep)</SelectItem>
              <SelectItem value="q2">Q2 (Oct–Dec)</SelectItem>
              <SelectItem value="q3">Q3 (Jan–Mar)</SelectItem>
              <SelectItem value="q4">Q4 (Apr–Jun)</SelectItem>
              <SelectItem value="ytd">Financial Year to Date</SelectItem>
              <SelectItem value="fy">Full Financial Year</SelectItem>
              <SelectItem value="last_fy">Last Financial Year</SelectItem>
              <SelectItem value="last_6">Last 6 Months</SelectItem>
              <SelectItem value="last_12">Last 12 Months</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {['q1', 'q2', 'q3', 'q4', 'fy', 'ytd'].includes(period) && (
            <Select value={String(fyStart)} onValueChange={v => setFyStart(Number(v))}>
              <SelectTrigger className="w-[110px] h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3].map(i => { const y = currentFYStart() - i; return (
                  <SelectItem key={y} value={String(y)}>{financialYearLabel(y)}</SelectItem>
                ); })}
              </SelectContent>
            </Select>
          )}
          {period === 'custom' && (
            <>
              <Input type="date" className="w-[150px] h-9 text-sm" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              <Input type="date" className="w-[150px] h-9 text-sm" value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((s, i) => (
            <div key={s.name} className="relative rounded-lg border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.name}</p>
              <p className="text-3xl font-semibold mt-1">{s.value}</p>
              {s.sub && <p className="text-xs text-muted-foreground">{s.sub}</p>}
              {s.rate !== undefined && <p className="text-sm font-medium text-primary mt-1">{pctFmt(s.rate)} {s.rateLabel}</p>}
              {i < steps.length - 1 && <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground bg-background rounded-full" />}
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-muted/50 p-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span>Lead → Options: <b>{pctFmt(r.leadToPresented)}</b></span>
          <span>Options → Lodged: <b>{pctFmt(r.presentedToLodged)}</b></span>
          <span>Lodged → Settled: <b>{pctFmt(r.lodgedToSettled)}</b></span>
          <span>Lead → Settled: <b>{pctFmt(r.leadToSettled)}</b></span>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Month by month</h4>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Month</TableHead><TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Options</TableHead><TableHead className="text-right">Lead→Options</TableHead>
                <TableHead className="text-right">Lodged</TableHead><TableHead className="text-right">Options→Lodged</TableHead>
                <TableHead className="text-right">Settled</TableHead><TableHead className="text-right">Lodged→Settled</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {months.map(m => { const mr = rates(m.funnel); return (
                  <TableRow key={m.key}>
                    <TableCell>{m.label}</TableCell>
                    <TableCell className="text-right">{m.funnel.leads}</TableCell>
                    <TableCell className="text-right">{m.funnel.presented}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{pctFmt(mr.leadToPresented)}</TableCell>
                    <TableCell className="text-right">{m.funnel.lodged}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{pctFmt(mr.presentedToLodged)}</TableCell>
                    <TableCell className="text-right">{m.funnel.settled}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{pctFmt(mr.lodgedToSettled)}</TableCell>
                  </TableRow>
                ); })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Lead sources — {range.label}</h4>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Source</TableHead><TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">% of leads</TableHead><TableHead className="text-right">Options</TableHead>
                <TableHead className="text-right">Lodged</TableHead><TableHead className="text-right">Settled</TableHead>
                <TableHead className="text-right">Lead→Settled</TableHead>
                <TableHead className="text-right">Lodged $</TableHead><TableHead className="text-right">Settled $</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {sources.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No leads in this period</TableCell></TableRow>}
                {sources.map(s => (
                  <TableRow key={s.source}>
                    <TableCell className="capitalize">{label(s.source)}</TableCell>
                    <TableCell className="text-right">{s.funnel.leads}</TableCell>
                    <TableCell className="text-right font-medium">{pctFmt(s.share)}</TableCell>
                    <TableCell className="text-right">{s.funnel.presented}</TableCell>
                    <TableCell className="text-right">{s.funnel.lodged}</TableCell>
                    <TableCell className="text-right">{s.funnel.settled}</TableCell>
                    <TableCell className="text-right font-medium">{pctFmt(rates(s.funnel).leadToSettled)}</TableCell>
                    <TableCell className="text-right">{money(s.funnel.lodgedVolume)}</TableCell>
                    <TableCell className="text-right">{money(s.funnel.settledVolume)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
