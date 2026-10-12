import { endOfDay, endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns';

export type LeadReportPeriod = 'all' | 'this_month' | 'last_month' | 'current_quarter' | 'q1' | 'q2' | 'q3' | 'q4' | 'fy' | 'ytd' | 'month' | 'last_6' | 'last_12' | 'this_fy' | 'last_fy' | 'custom';
export const currentFYStart = (now = new Date()) => now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
export const financialYearLabel = (year: number) => `FY${String(year + 1).slice(-2)}`;
export const FY_MONTHS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

export function getLeadReportRange(period: LeadReportPeriod, customFrom = '', customTo = '', fyStart = currentFYStart(), month = 0, now = new Date(), earliest?: Date) {
  const fyRange = (year: number) => ({ from: new Date(year, 6, 1), to: endOfMonth(new Date(year + 1, 5, 1)), label: `${financialYearLabel(year)} (Jul ${year} – Jun ${year + 1})` });
  if (period === 'all') return { from: startOfMonth(earliest ?? now), to: endOfMonth(now), label: 'All Time' };
  if (period === 'fy') return fyRange(fyStart);
  if (period === 'this_fy') return fyRange(currentFYStart(now));
  if (period === 'last_fy') return fyRange(currentFYStart(now) - 1);
  if (period === 'ytd') return { from: new Date(fyStart, 6, 1), to: endOfDay(now), label: `${financialYearLabel(fyStart)} year to date` };
  if (period === 'current_quarter' || /^q[1-4]$/.test(period)) {
    const quarter = period === 'current_quarter' ? Math.floor(((now.getMonth() + 6) % 12) / 3) : Number(period.slice(1)) - 1;
    const year = period === 'current_quarter' ? currentFYStart(now) : fyStart;
    const from = new Date(year, 6 + quarter * 3, 1);
    const to = endOfMonth(new Date(year, 8 + quarter * 3, 1));
    return { from, to, label: `${financialYearLabel(year)} Q${quarter + 1} (${format(from, 'MMM yyyy')} – ${format(to, 'MMM yyyy')})` };
  }
  if (period === 'month') {
    const date = new Date(fyStart, 6 + month, 1);
    return { from: date, to: endOfMonth(date), label: format(date, 'MMMM yyyy') };
  }
  if (period === 'this_month' || period === 'last_month') {
    const date = period === 'this_month' ? now : subMonths(now, 1);
    return { from: startOfMonth(date), to: endOfMonth(date), label: format(date, 'MMMM yyyy') };
  }
  if (period === 'last_6' || period === 'last_12') {
    const months = period === 'last_6' ? 6 : 12;
    const from = startOfMonth(subMonths(now, months - 1));
    return { from, to: endOfMonth(now), label: `Last ${months} months (${format(from, 'MMM yyyy')} – ${format(now, 'MMM yyyy')})` };
  }
  const from = customFrom ? parseISO(customFrom) : startOfMonth(subMonths(now, 11));
  const to = customTo ? endOfDay(parseISO(customTo)) : endOfDay(now);
  return { from, to, label: `${format(from, 'd MMM yyyy')} – ${format(to, 'd MMM yyyy')}` };
}