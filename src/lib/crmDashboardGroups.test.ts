import { describe, expect, it } from 'vitest';
import { getDealDashboard, stageDashboard } from './crmDashboardGroups';

describe('dedicated deal dashboards', () => {
  it('keeps Parked out of Leads and WIP even with a previous WIP stage', () => {
    expect(getDealDashboard({ status: 'parked', wip_status: 'lodged' })).toBe('parked');
  });
  it('keeps Lost out of Leads and WIP even with a previous WIP stage', () => {
    expect(getDealDashboard({ status: 'lost', wip_status: 'onboarding' })).toBe('lost');
  });
  it('groups existing onboarding and document-collection stages separately', () => {
    for (const wip_status of ['pending_fact_find', 'onboarding', 'pending_additional_docs', 'sent_for_onboarding']) {
      expect(getDealDashboard({ status: 'in_progress', wip_status })).toBe('onboarding');
    }
  });
  it('retains later processing stages in WIP and new enquiries in Leads', () => {
    expect(getDealDashboard({ status: 'in_progress', wip_status: 'researching' })).toBe('wip');
    expect(getDealDashboard({ status: 'new' })).toBe('leads');
  });
  it('supports renamed status keys with the same configured label without broad substring matches', () => {
    expect(getDealDashboard({ status: 'deferred' }, [{ name: 'deferred', label: 'Parked' }])).toBe('parked');
    expect(stageDashboard('lost_contact_attempt')).toBe(null);
  });
  it('assigns every deal to exactly one dashboard and routes stage changes immediately', () => {
    const lead = { status: 'in_progress', wip_status: 'onboarding' };
    expect(getDealDashboard(lead)).toBe('onboarding');
    expect(getDealDashboard({ ...lead, wip_status: 'lodged' })).toBe('wip');
    expect(getDealDashboard({ ...lead, status: 'lost' })).toBe('lost');
  });
});