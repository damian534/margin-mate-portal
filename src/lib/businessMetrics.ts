import { addMonths, format, parseISO } from 'date-fns';

export interface MetricsLead {
  id: string;
  created_at: string;
  status: string;
  source: string | null;
  loan_amount: number | null;
  proposal_sent_date?: string | null;
  lodged_date?: string | null;
  approved_date?: string | null;
  settled_date?: string | null;
}

/** lead_id -> settlement date (yyyy-MM-dd) from the settlements table. */
export type SettlementDates = Map<string, string | null>;

const amt = (l: MetricsLead) => Number(l.loan_amount) || 0;
const inRange = (d: string | null | undefined, from: Date, to: Date) => {
  if (!d) return false;
  const dt = parseISO(d);
  return Number.isFinite(dt.getTime()) && dt >= from && dt <= to;
};

export const isSettled = (l: MetricsLead, s: SettlementDates) => !!(l.settled_date || l.status === 'settled' || s.has(l.id));
export const isLodged = (l: MetricsLead, s: SettlementDates) => !!(l.lodged_date || l.approved_date || isSettled(l, s));
/** Options presented = reached Proposal Sent, or any later stage (lodged / approved / settled). */
export const isPresented = (l: MetricsLead, s: SettlementDates) => !!(l.proposal_sent_date || isLodged(l, s));

export const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

export interface Funnel {
  leads: number; presented: number; lodged: number; settled: number;
  leadVolume: number; lodgedVolume: number; settledVolume: number;
}

export function rates(f: Funnel) {
  return {
    leadToPresented: pct(f.presented, f.leads),
    presentedToLodged: pct(f.lodged, f.presented),
    lodgedToSettled: pct(f.settled, f.lodged),
    leadToSettled: pct(f.settled, f.leads),
  };
}

/** Cohort: leads created in the period, followed through every later stage. */
export function cohortFunnel(leads: MetricsLead[], s: SettlementDates, from: Date, to: Date): Funnel {
  const f: Funnel = { leads: 0, presented: 0, lodged: 0, settled: 0, leadVolume: 0, lodgedVolume: 0, settledVolume: 0 };
  for (const l of leads) {
    if (!inRange(l.created_at, from, to)) continue;
    f.leads++; f.leadVolume += amt(l);
    if (isPresented(l, s)) f.presented++;
    if (isLodged(l, s)) { f.lodged++; f.lodgedVolume += amt(l); }
    if (isSettled(l, s)) { f.settled++; f.settledVolume += amt(l); }
  }
  return f;
}

const settledOn = (l: MetricsLead, s: SettlementDates) => s.get(l.id) || l.settled_date || null;

/** Activity: each step counted in the month it actually happened, regardless of when the lead came in. */
export function activityFunnel(leads: MetricsLead[], s: SettlementDates, from: Date, to: Date): Funnel {
  const f: Funnel = { leads: 0, presented: 0, lodged: 0, settled: 0, leadVolume: 0, lodgedVolume: 0, settledVolume: 0 };
  for (const l of leads) {
    if (inRange(l.created_at, from, to)) { f.leads++; f.leadVolume += amt(l); }
    if (inRange(l.proposal_sent_date, from, to)) f.presented++;
    if (inRange(l.lodged_date, from, to)) { f.lodged++; f.lodgedVolume += amt(l); }
    if (inRange(settledOn(l, s), from, to)) { f.settled++; f.settledVolume += amt(l); }
  }
  return f;
}

export function monthlyFunnels(kind: 'cohort' | 'activity', leads: MetricsLead[], s: SettlementDates, from: Date, to: Date) {
  const rows: { key: string; label: string; funnel: Funnel }[] = [];
  for (let m = new Date(from.getFullYear(), from.getMonth(), 1); m <= to; m = addMonths(m, 1)) {
    const end = new Date(addMonths(m, 1).getTime() - 1);
    const fn = kind === 'cohort' ? cohortFunnel : activityFunnel;
    rows.push({ key: format(m, 'yyyy-MM'), label: format(m, 'MMM yy'), funnel: fn(leads, s, m, end < to ? end : to) });
  }
  return rows;
}

export function sourceMetrics(leads: MetricsLead[], s: SettlementDates, from: Date, to: Date) {
  const map = new Map<string, Funnel>();
  let total = 0;
  for (const l of leads) {
    if (!inRange(l.created_at, from, to)) continue;
    total++;
    const key = l.source || 'unknown';
    const f = map.get(key) || { leads: 0, presented: 0, lodged: 0, settled: 0, leadVolume: 0, lodgedVolume: 0, settledVolume: 0 };
    f.leads++; f.leadVolume += amt(l);
    if (isPresented(l, s)) f.presented++;
    if (isLodged(l, s)) { f.lodged++; f.lodgedVolume += amt(l); }
    if (isSettled(l, s)) { f.settled++; f.settledVolume += amt(l); }
    map.set(key, f);
  }
  return Array.from(map.entries())
    .map(([source, funnel]) => ({ source, funnel, share: pct(funnel.leads, total) }))
    .sort((a, b) => b.funnel.leads - a.funnel.leads);
}
