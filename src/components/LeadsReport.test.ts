import { describe, it, expect } from 'vitest';
import { isLeadSettled, isLeadLodged, isLeadApproved } from './LeadsReport';

const base = {
  id: 'lead-1',
  first_name: 'Test',
  last_name: 'Lead',
  loan_amount: 500000,
  status: 'approved',
  source: null,
  created_at: '2026-09-01T00:00:00Z',
};

describe('settled detection via settlements table', () => {
  it('counts a lead as settled when it has a settlement record', () => {
    const settled = new Set(['lead-1']);
    expect(isLeadSettled(base, settled)).toBe(true);
    expect(isLeadLodged(base, settled)).toBe(true);
    expect(isLeadApproved(base, settled)).toBe(true);
  });

  it('does not count a lead without a settlement record or settled status', () => {
    expect(isLeadSettled(base, new Set())).toBe(false);
    expect(isLeadSettled(base)).toBe(false);
  });

  it('still counts settled_date and settled status without a settlement record', () => {
    expect(isLeadSettled({ ...base, settled_date: '2026-09-20' })).toBe(true);
    expect(isLeadSettled({ ...base, status: 'settled' })).toBe(true);
  });
});
