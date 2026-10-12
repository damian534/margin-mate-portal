import { describe, expect, it } from 'vitest';
import { format } from 'date-fns';
import { getLeadReportRange } from './leadReportPeriods';

describe('Lead Flow matches Australian settlement periods', () => {
  const now = new Date(2026, 9, 13);
  it.each([
    ['q1', '2026-07-01', '2026-09-30'],
    ['q2', '2026-10-01', '2026-12-31'],
    ['q3', '2027-01-01', '2027-03-31'],
    ['q4', '2027-04-01', '2027-06-30'],
  ] as const)('%s uses financial-year dates, not calendar quarters', (period, from, to) => {
    const range = getLeadReportRange(period, '', '', 2026, 0, now);
    expect(format(range.from, 'yyyy-MM-dd')).toBe(from);
    expect(format(range.to, 'yyyy-MM-dd')).toBe(to);
    expect(range.to.getMilliseconds()).toBe(999);
  });
  it('current quarter is October–December in October', () => {
    const range = getLeadReportRange('current_quarter', '', '', 2025, 0, now);
    expect(format(range.from, 'yyyy-MM-dd')).toBe('2026-10-01');
    expect(format(range.to, 'yyyy-MM-dd')).toBe('2026-12-31');
  });
  it('current quarter rolls into FY Q3 in January', () => {
    const range = getLeadReportRange('current_quarter', '', '', 2026, 0, new Date(2027, 0, 10));
    expect(format(range.from, 'yyyy-MM-dd')).toBe('2027-01-01');
    expect(format(range.to, 'yyyy-MM-dd')).toBe('2027-03-31');
  });
  it('allows Q1 of a previous financial year', () => {
    expect(format(getLeadReportRange('q1', '', '', 2025, 0, now).from, 'yyyy-MM-dd')).toBe('2025-07-01');
  });
  it('FYTD ends today', () => {
    const range = getLeadReportRange('ytd', '', '', 2026, 0, now);
    expect(format(range.from, 'yyyy-MM-dd')).toBe('2026-07-01');
    expect(format(range.to, 'yyyy-MM-dd')).toBe('2026-10-13');
  });
  it('January belongs to the second calendar year in the selected FY', () => {
    const range = getLeadReportRange('month', '', '', 2026, 6, now);
    expect(format(range.from, 'yyyy-MM-dd')).toBe('2027-01-01');
    expect(format(range.to, 'yyyy-MM-dd')).toBe('2027-01-31');
  });
});