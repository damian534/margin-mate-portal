import { describe, expect, it } from 'vitest';
import { getDealDashboard, stageDashboard, getStatusDashboard, getLeadsColumnKey, WIP_BOARD_OPTIONS } from './crmDashboardGroups';

describe('dedicated deal dashboards', () => {
  it('offers Leads as a destination for Meeting Booked processing columns', () => {
    expect(WIP_BOARD_OPTIONS.some(option => option.value === 'leads')).toBe(true);
  });
  it('moves Meeting Booked deals to Leads without changing their recorded stages', () => {
    const stages = [{ name: 'meeting_booked', label: 'Meeting Booked', dashboard: 'leads' }];
    const deal = { status: 'in_progress', wip_status: 'meeting_booked' };
    expect(getDealDashboard(deal, [], stages)).toBe('leads');
    expect(getStatusDashboard('meeting_booked', stages, 'wip')).toBe('leads');
    expect(getLeadsColumnKey(deal)).toBe('wip:meeting_booked');
    expect(getDealDashboard(deal, [], [{ ...stages[0], dashboard: 'wip' }])).toBe('wip');
  });
  it('separates pre-approved deals in either status field from active Leads and WIP', () => {
    expect(getDealDashboard({ status: 'in_progress', wip_status: 'preapproved' })).toBe('preapproved');
    expect(getDealDashboard({ status: 'pre_approved' })).toBe('preapproved');
    expect(stageDashboard('custom_preapproval', [{ name: 'custom_preapproval', label: 'Pre-approved' }])).toBe('preapproved');
    expect(getDealDashboard({ status: 'preapproved', wip_status: 'lodged' })).toBe('wip');
  });
  it('separates settled deals in either status field without using historical settlement dates', () => {
    expect(getDealDashboard({ status: 'in_progress', wip_status: 'settled' })).toBe('settled');
    expect(getDealDashboard({ status: 'settled', wip_status: 'lodged' })).toBe('settled');
    expect(getDealDashboard({ status: 'in_progress', wip_status: 'formal_approval' })).toBe('wip');
  });
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
  it('keeps deals on the Onboarding dashboard when the Onboarding stage is renamed to Pending Documents', () => {
    // Renaming the stage must not drop its deals onto the WIP board.
    expect(getDealDashboard({ status: 'in_progress', wip_status: 'pending_documents' })).toBe('onboarding');
    const renamed = [{ name: 'pending_documents', label: 'Pending Documents', dashboard: 'onboarding' }];
    expect(stageDashboard('pending_documents', renamed)).toBe('onboarding');
    expect(getDealDashboard({ status: 'in_progress', wip_status: 'pending_documents' }, [], renamed)).toBe('onboarding');
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
  it('honours an explicit board assignment over the status name', () => {
    // "Lost/Archived" does not name-match 'lost', so it needs an explicit assignment.
    const leadStatuses = [{ name: 'lost/archived', label: 'Lost/Archived', dashboard: 'lost' }];
    expect(stageDashboard('lost/archived', leadStatuses)).toBe('lost');
    expect(getDealDashboard({ status: 'lost/archived', wip_status: 'lodged' }, leadStatuses)).toBe('lost');
  });
  it('lets an explicit leads/wip assignment keep a name-matched status on the main board', () => {
    expect(stageDashboard('lost', [{ name: 'lost', label: 'Lost', dashboard: 'leads' }])).toBe(null);
    expect(getDealDashboard({ status: 'lost' }, [{ name: 'lost', label: 'Lost', dashboard: 'leads' }])).toBe('leads');
    expect(getDealDashboard(
      { status: 'in_progress', wip_status: 'settled' },
      [],
      [{ name: 'settled', label: 'Settled', dashboard: 'wip' }],
    )).toBe('wip');
  });
  it('falls back to name matching when a status has no explicit assignment', () => {
    expect(stageDashboard('lost', [{ name: 'lost', label: 'Lost', dashboard: null }])).toBe('lost');
    expect(stageDashboard('parked', [{ name: 'parked', label: 'Parked' }])).toBe('parked');
  });
});
import { buildStageChoices, currentStageChoice } from './crmDashboardGroups';
describe('buildStageChoices', () => {
  it('offers WIP stages assigned to Leads under the Leads group', () => {
    const groups = buildStageChoices([{ name: 'new', label: 'New' }], [{ name: 'meeting_booked', label: 'Meeting Booked', dashboard: 'leads' }, { name: 'lodged', label: 'Lodged' }]);
    expect(groups.find(g => g.board === 'leads')!.options.map(o => o.value)).toEqual(['lead:new', 'wip:meeting_booked']);
    expect(groups.find(g => g.board === 'wip')!.options.map(o => o.value)).toEqual(['wip:lodged']);
  });
  it('current choice prefers the WIP stage', () => {
    expect(currentStageChoice({ status: 'new', wip_status: 'lodged' })).toBe('wip:lodged');
    expect(currentStageChoice({ status: 'new', wip_status: null })).toBe('lead:new');
  });
});
