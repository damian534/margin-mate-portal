import { describe, it, expect } from 'vitest';
import { isLeadLodged, isLeadApproved } from '@/components/LeadsReport';

const base = { id: '1', first_name: 'A', last_name: 'B', loan_amount: 1, source: null, created_at: '2026-09-01' };

describe('lead stage follow-through', () => {
  it('counts a lead lodged after its creation month as lodged', () => {
    expect(isLeadLodged({ ...base, status: 'in_progress', lodged_date: '2026-10-05' })).toBe(true);
  });
  it('still counts a settled lead as lodged and approved', () => {
    const l = { ...base, status: 'settled' };
    expect(isLeadLodged(l)).toBe(true);
    expect(isLeadApproved(l)).toBe(true);
  });
  it('does not count a new lead with no dates', () => {
    expect(isLeadLodged({ ...base, status: 'new' })).toBe(false);
  });
});
