export type DealDashboard = 'leads' | 'onboarding' | 'wip' | 'parked' | 'lost' | 'preapproved' | 'settled';

interface StageConfig { name: string; label: string; dashboard?: string | null }
interface DashboardLead { status: string; wip_status?: string | null }

const normalise = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, '_');
const ONBOARDING_STAGES = new Set(['pending_fact_find', 'onboarding', 'pending_documents', 'pending_docs', 'pending_additional_docs', 'pending_additional_documents', 'sent_for_onboarding']);
const DEDICATED_DASHBOARDS = new Set(['onboarding', 'parked', 'lost', 'preapproved', 'settled']);

export function stageDashboard(name: string, statuses: StageConfig[] = []): Exclude<DealDashboard, 'leads' | 'wip'> | null {
  const config = statuses.find(s => s.name === name);
  // An explicit board assignment on the status wins over name-based matching;
  // 'leads'/'wip' mean "no dedicated dashboard". NULL falls back to name matching.
  if (config?.dashboard != null) {
    return (DEDICATED_DASHBOARDS.has(config.dashboard) ? config.dashboard : null) as Exclude<DealDashboard, 'leads' | 'wip'> | null;
  }
  const keys = [normalise(name), normalise(config?.label || '')];
  if (keys.includes('parked')) return 'parked';
  if (keys.includes('lost')) return 'lost';
  if (keys.includes('settled')) return 'settled';
  if (keys.some(key => ['preapproved', 'pre_approved', 'preapproval', 'pre_approval'].includes(key))) return 'preapproved';
  if (keys.some(key => ONBOARDING_STAGES.has(key))) return 'onboarding';
  return null;
}

export function getDealDashboard(lead: DashboardLead, leadStatuses: StageConfig[] = [], wipStatuses: StageConfig[] = []): DealDashboard {
  const leadGroup = stageDashboard(lead.status, leadStatuses);
  if (leadGroup === 'parked' || leadGroup === 'lost' || leadGroup === 'settled') return leadGroup;
  if (lead.wip_status) return stageDashboard(lead.wip_status, wipStatuses) || 'wip';
  return leadGroup || 'leads';
}

/** Board choices offered when managing lead statuses (first = default for new statuses). */
export const LEAD_BOARD_OPTIONS = [
  { value: 'leads', label: 'Leads' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'parked', label: 'Parked' },
  { value: 'lost', label: 'Lost' },
  { value: 'preapproved', label: 'Pre-approved' },
  { value: 'settled', label: 'Settled' },
] as const;

/** Board choices offered when managing WIP (loan progress) statuses. */
export const WIP_BOARD_OPTIONS = [
  { value: 'wip', label: 'WIP' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'parked', label: 'Parked' },
  { value: 'lost', label: 'Lost' },
  { value: 'preapproved', label: 'Pre-approved' },
  { value: 'settled', label: 'Settled' },
] as const;