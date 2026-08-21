import { describe, it, expect } from 'vitest';
import { computeServicing, traceUpstream, currentFinancialYear, fyLabel } from './servicing';
import type { LeadEntity, LeadEntityFlow } from './types';

const entity = (id: string, name: string, extra: Partial<LeadEntity> = {}): LeadEntity => ({
  id, lead_id: 'l1', name, entity_type: 'company', abn: null, acn: null,
  trustee_entity_id: null, is_applicant: false, fy_end: null, notes: null,
  position_x: 0, position_y: 0, sort_order: 0, ...extra,
});

const flow = (id: string, from: string, to: string, amount: number, extra: Partial<LeadEntityFlow> = {}): LeadEntityFlow => ({
  id, lead_id: 'l1', from_entity_id: from, to_entity_id: to, financial_year: 2026,
  amount, flow_type: 'trust_distribution', use_for_servicing: true, notes: null, ...extra,
});

describe('computeServicing', () => {
  const entities = [
    entity('co', 'Trading Co Pty Ltd'),
    entity('t1', 'Family Trust A', { entity_type: 'discretionary_trust' }),
    entity('t2', 'Family Trust B', { entity_type: 'discretionary_trust' }),
    entity('client', 'Client', { entity_type: 'individual', is_applicant: true }),
    entity('spouse', 'Spouse', { entity_type: 'individual', is_applicant: true }),
  ];
  const flows = [
    flow('f1', 'co', 't1', 100000, { flow_type: 'net_profit' }),
    flow('f2', 't1', 'client', 60000),
    flow('f3', 't1', 't2', 40000),
    flow('f4', 't2', 'spouse', 40000),
  ];

  it('aggregates income landing on applicants', () => {
    const s = computeServicing(entities, flows, 2026);
    expect(s.applicants.find(a => a.entityId === 'client')?.total).toBe(60000);
    expect(s.applicants.find(a => a.entityId === 'spouse')?.total).toBe(40000);
    expect(s.totalServiceable).toBe(100000);
  });

  it('flags money that stops at a non-applicant entity', () => {
    const s = computeServicing(entities, [flow('f1', 'co', 't1', 100000)], 2026);
    expect(s.warnings.some(w => w.kind === 'dead_end')).toBe(true);
  });

  it('ignores flows from other financial years', () => {
    const s = computeServicing(entities, flows, 2025);
    expect(s.totalServiceable).toBe(0);
  });

  it('traces the upstream chain to an applicant', () => {
    const { entityIds } = traceUpstream('spouse', flows, 2026);
    expect([...entityIds].sort()).toEqual(['co', 'spouse', 't1', 't2']);
  });
});

describe('financial year helpers', () => {
  it('rolls over on 1 July', () => {
    expect(currentFinancialYear(new Date('2026-06-30T00:00:00'))).toBe(2026);
    expect(currentFinancialYear(new Date('2026-07-01T00:00:00'))).toBe(2027);
  });
  it('labels the FY', () => {
    expect(fyLabel(2026)).toBe('FY 2025/26');
  });
});
