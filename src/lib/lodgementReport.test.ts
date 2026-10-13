import { describe, expect, it } from 'vitest';
import { getLodgementMonths } from './lodgementReport';

const from = new Date(2026, 8, 1);
const to = new Date(2026, 8, 30, 23, 59, 59, 999);
describe('actual monthly lodgements', () => {
  it('includes an August lead lodged in September, even after settlement', () => {
    const rows = getLodgementMonths([{ created_at: '2026-08-18', lodged_date: '2026-09-15', settled_date: '2026-10-10', loan_amount: 920000 }], from, to);
    expect(rows[0].count).toBe(1);
    expect(rows[0].volume).toBe(920000);
  });
  it('excludes September leads lodged in October', () => {
    expect(getLodgementMonths([{ created_at: '2026-09-30', lodged_date: '2026-10-05', loan_amount: 500000 }], from, to)[0].count).toBe(0);
  });
  it('does not invent a lodgement date from approval or settlement', () => {
    expect(getLodgementMonths([{ approved_date: '2026-09-15', lodged_date: null, loan_amount: 500000 }], from, to)[0].count).toBe(0);
  });
  it('includes the last day and counts a deal once', () => {
    const row = getLodgementMonths([{ lodged_date: '2026-09-30', loan_amount: 700000 }], from, to)[0];
    expect(row.count).toBe(1);
    expect(row.volume).toBe(700000);
  });
});