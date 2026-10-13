import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowRight } from 'lucide-react';
import { currentFYStart, financialYearLabel, getLeadReportRange, type LeadReportPeriod } from '@/lib/leadReportPeriods';
import {
  activityFunnel, cohortFunnel, monthlyFunnels, rates, sourceMetrics,
  type MetricsLead, type SettlementDates,
} from '@/lib/businessMetrics';

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-AU');
const pctFmt = (n: number) => `${n.toFixed(0)}%`;

export function BusinessMetrics({ leads, leadSources }: { leads: MetricsLead[]; leadSources?: { name: string; label: string }[] }) {
  const [view, setView] = useState<'cohort' | 'activity'>('cohort');
  const [settlements, setSettlements] = useState<SettlementDates>(new Map());

  useEffect(() => {
    supabase.from('settlements').select('lead_id, settlement_date').then(({ data }) => {
      const m: SettlementDates = new Map();
      (data || []).forEach((s: any) => { if (s.lead_id) m.set(s.lead_id, s.settlement_date); });
      setSettlements(m);
    });
  }, []);

  const fy = currentFYStart();
  const from = new Date(fy, 6, 1);
  const to = new Date(fy + 1, 5, 30, 23, 59, 59);

  const funnel = useMemo(
    () => (view === 'cohort' ? cohortFunnel : activityFunnel)(leads, settlements, from, to),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, leads, settlements, fy],
  );
  const r = rates(funnel);
  const months = useMemo(() => monthlyFunnels(view, leads, settlements, from, new Date()), [view, leads, settlements, fy]); // eslint-disable-line react-hooks/exhaustive-deps
  const sources = useMemo(() => sourceMetrics(leads, settlements, from, to), [leads, settlements, fy]); // eslint-disable-line react-hooks/exhaustive-deps
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
          <CardTitle className="text-lg">Business Metrics — {financialYearLabel(fy)}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {view === 'cohort'
              ? 'Leads that came in this financial year, followed through to settlement.'
              : 'Every step counted in the month it happened this financial year, whenever the lead came in.'}
          </p>
        </div>
        <Tabs value={view} onValueChange={v => setView(v as 'cohort' | 'activity')}>
          <TabsList>
            <TabsTrigger value="cohort">Follow this FY's leads</TabsTrigger>
            <TabsTrigger value="activity">When it happened</TabsTrigger>
          </TabsList>
        </Tabs>
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
        {view === 'activity' && <p className="text-xs text-muted-foreground -mt-4">In this view the % compare counts within the year, so a deal lodged now may settle next month.</p>}

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
          <h4 className="text-sm font-semibold mb-2">Lead sources — {financialYearLabel(fy)} leads</h4>
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
                {sources.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No leads yet this financial year</TableCell></TableRow>}
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
