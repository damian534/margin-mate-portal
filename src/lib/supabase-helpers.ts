import { supabase } from "@/integrations/supabase/client";

export async function getCurrentUserRole(): Promise<'broker' | 'referral_partner' | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  return data?.role as 'broker' | 'referral_partner' | null;
}

export async function getUserProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export const DEFAULT_LEAD_STATUSES = [
  { value: 'new', label: 'New', color: '#6b7280' },
  { value: 'contacted', label: 'Contacted', color: '#3b82f6' },
  { value: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { value: 'qualified', label: 'Qualified', color: '#8b5cf6' },
  { value: 'approved', label: 'Approved', color: '#10b981' },
  { value: 'settled', label: 'Settled', color: '#22c55e' },
  { value: 'lost', label: 'Lost', color: '#ef4444' },
] as const;

// Keep backwards compat alias
export const LEAD_STATUSES = DEFAULT_LEAD_STATUSES;

export function getStatusConfig(status: string) {
  return DEFAULT_LEAD_STATUSES.find(s => s.value === status) || DEFAULT_LEAD_STATUSES[0];
}
