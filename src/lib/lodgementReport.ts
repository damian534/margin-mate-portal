import { addMonths, format, parseISO, startOfMonth } from 'date-fns';

interface LodgementLead {
  lodged_date?: string | null;
  loan_amount: number | null;
}

/** Actual lodgements use the recorded lodgement date, never creation or later stage dates. */
export function getLodgementMonths<T extends LodgementLead>(leads: T[], from: Date, to: Date) {
  const months = new Map<string, { key: string; label: string; count: number; volume: number; leads: T[] }>();
  for (let date = startOfMonth(from); date <= to; date = addMonths(date, 1)) {
    const key = format(date, 'yyyy-MM');
    months.set(key, { key, label: format(date, 'MMM yyyy'), count: 0, volume: 0, leads: [] });
  }
  for (const lead of leads) {
    if (!lead.lodged_date) continue;
    const date = parseISO(lead.lodged_date);
    if (!Number.isFinite(date.getTime()) || date < from || date > to) continue;
    const month = months.get(format(date, 'yyyy-MM'));
    if (!month) continue;
    month.count++;
    month.volume += Number(lead.loan_amount) || 0;
    month.leads.push(lead);
  }
  return Array.from(months.values());
}