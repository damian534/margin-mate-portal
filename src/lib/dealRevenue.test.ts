import { describe, expect, it } from 'vitest';
import { calculateDealRevenue, loanTotalOnLoad } from './dealRevenue';

describe('estimated deal revenue', () => {
  it('uses 0.65% upfront', () => {
    expect(calculateDealRevenue(1_000_000).upfront).toBe(6500);
  });
  it('uses two years of 0.15% annual trail on the original loan amount', () => {
    expect(calculateDealRevenue(1_000_000).trail).toBe(3000);
  });
  it('adds the mandate fee to revenue', () => {
    expect(calculateDealRevenue(1_000_000, 2500).total).toBe(12000);
  });
  it('handles empty amounts and rounds to cents', () => {
    expect(calculateDealRevenue(null, 500).total).toBe(500);
    expect(calculateDealRevenue(650_123).upfront).toBe(4225.80);
  });
  it('keeps a manually entered loan when there are no splits', () => {
    expect(loanTotalOnLoad([])).toBeUndefined();
    expect(loanTotalOnLoad([400000, 250000])).toBe(650000);
  });
});