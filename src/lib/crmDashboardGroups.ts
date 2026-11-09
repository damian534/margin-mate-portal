export type DealDashboard = 'leads' | 'onboarding' | 'wip' | 'parked' | 'lost' | 'preapproved' | 'settled';

interface StageConfig { name: string; label: string }
interface DashboardLead { status: string; wip_status?: string | null }

const normalise = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, '_');
const ONBOARDING_STAGES = new Set(['pending_fact_find', 'onboarding', 'pending_additional_docs', 'pending_additional_documents', 'sent_for_onboarding']);

export function stageDashboard(name: string, statuses: StageConfig[] = []): Exclude<DealDashboard, 'leads' | 'wip'> | null {
  const config = statuses.find(s => s.name === name);
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