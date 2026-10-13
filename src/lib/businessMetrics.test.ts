import { describe, it, expect } from 'vitest';
import { cohortFunnel, activityFunnel, isPresented, rates, sourceMetrics } from './businessMetrics';

const from = new Date(2026, 6, 1);
const to = new Date(2027, 5, 30, 23, 59);
const base = { status: 'new', source: 'direct_call', loan_amount: 500000 };
const none = new Map<string, string | null>();

describe('business metrics', () => {
  it('counts a lead as options presented when it reached Proposal Sent', () => {
    expect(isPresented({ ...base, id: '1', created_at: '2026-08-01', proposal_sent_date: '2026-08-10' }, none)).toBe(true);
  });
  it('counts a lead that skipped Proposal Sent but lodged as options presented', () => {
    expect(isPresented({ ...base, id: '1', created_at: '2026-08-01', lodged_date: '2026-09-01' }, none)).toBe(true);
  });
  it('cohort follows FY leads through to settlement and gives % conversions', () => {
    const leads = [
      { ...base, id: 'a', created_at: '2026-08-01', proposal_sent_date: '2026-08-05', lodged_date: '2026-08-20' },
      { ...base, id: 'b', created_at: '2026-09-01', proposal_sent_date: '2026-09-05' },
      { ...base, id: 'c', created_at: '2026-09-02' },
      { ...base, id: 'd', created_at: '2026-05-01', lodged_date: '2026-08-01' },
    ];
    const f = cohortFunnel(leads, new Map([['a', '2026-10-01']]), from, to);
    expect([f.leads, f.presented, f.lodged, f.settled]).toEqual([3, 2, 1, 1]);
    expect(rates(f).lodgedToSettled).toBe(100);
    expect(rates(f).presentedToLodged).toBe(50);
  });
  it('activity counts a lodgement in the FY even when the lead came in last FY', () => {
    const f = activityFunnel([{ ...base, id: 'd', created_at: '2026-05-01', lodged_date: '2026-08-01' }], none, from, to);
    expect([f.leads, f.lodged]).toEqual([0, 1]);
  });
  it('source share is a % of all FY leads', () => {
    const rows = sourceMetrics([
      { ...base, id: '1', created_at: '2026-08-01' },
      { ...base, id: '2', created_at: '2026-08-01', source: 'referral' },
      { ...base, id: '3', created_at: '2026-08-01', source: 'referral' },
      { ...base, id: '4', created_at: '2026-08-01', source: 'referral' },
    ], none, from, to);
    expect(rows[0]).toMatchObject({ source: 'referral', share: 75 });
  });
});
