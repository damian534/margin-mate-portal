export type DealDashboard = 'leads' | 'onboarding' | 'wip' | 'parked' | 'lost';

interface StageConfig { name: string; label: string }
interface DashboardLead { status: string; wip_status?: string | null }

const normalise = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, '_');
const ONBOARDING_STAGES = new Set(['pending_fact_find', 'onboarding', 'pending_additional_docs', 'pending_additional_documents', 'sent_for_onboarding']);

export function stageDashboard(name: string, statuses: StageConfig[] = []): 'parked' | 'lost' | 'onboarding' | null {
  const config = statuses.find(s => s.name === name);
  const keys = [normalise(name), normalise(config?.label || '')];
  if (keys.includes('parked')) return 'parked';
  if (keys.includes('lost')) return 'lost';
  if (keys.some(key => ONBOARDING_STAGES.has(key))) return 'onboarding';
  return null;
}

export function getDealDashboard(lead: DashboardLead, leadStatuses: StageConfig[] = [], wipStatuses: StageConfig[] = []): DealDashboard {
  const leadGroup = stageDashboard(lead.status, leadStatuses);
  if (leadGroup === 'parked' || leadGroup === 'lost') return leadGroup;
  if (lead.wip_status) return stageDashboard(lead.wip_status, wipStatuses) || 'wip';
  return leadGroup || 'leads';
}