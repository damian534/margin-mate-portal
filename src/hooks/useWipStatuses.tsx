import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface WipStatus {
  id: string;
  name: string;
  label: string;
  color: string;
  display_order: number;
  amber_after_days?: number | null;
  red_after_days?: number | null;
  dashboard?: string | null;
}

const DEFAULT_WIP_STATUSES: WipStatus[] = [
  { id: 'def-1', name: 'pending_fact_find', label: 'Pending Fact Find', color: '#cbd5e1', display_order: 0, dashboard: 'onboarding' },
  { id: 'def-2', name: 'onboarding', label: 'Onboarding', color: '#94a3b8', display_order: 1, dashboard: 'onboarding' },
  { id: 'def-3', name: 'pending_additional_docs', label: 'Pending Additional Documents', color: '#84cc16', display_order: 2, dashboard: 'onboarding' },
  { id: 'def-4', name: 'sent_for_onboarding', label: 'Sent for Onboarding', color: '#7c9eb2', display_order: 3, dashboard: 'onboarding' },
  { id: 'def-5', name: 'researching', label: 'Researching', color: '#64748b', display_order: 4, dashboard: 'wip' },
  { id: 'def-6', name: 'proposal_sent', label: 'Proposal Sent', color: '#0ea5e9', display_order: 5, dashboard: 'wip' },
  { id: 'def-7', name: 'new_application', label: 'New Application', color: '#3b82f6', display_order: 6, dashboard: 'wip' },
  { id: 'def-8', name: 'app_sent_signing', label: 'Application Sent for Signing', color: '#6366f1', display_order: 7, dashboard: 'wip' },
  { id: 'def-9', name: 'lodged', label: 'Lodged', color: '#8b5cf6', display_order: 8, dashboard: 'wip' },
  { id: 'def-10', name: 'preapproved', label: 'Preapproved', color: '#a855f7', display_order: 9, dashboard: 'preapproved' },
  { id: 'def-11', name: 'mir_issued', label: 'MIR Issued', color: '#f59e0b', display_order: 10, dashboard: 'wip' },
  { id: 'def-12', name: 'mir_resolved', label: 'MIR Resolved', color: '#eab308', display_order: 11, dashboard: 'wip' },
  { id: 'def-13', name: 'aip_not_lodged', label: 'AIP > Full Not Yet Lodged', color: '#f97316', display_order: 12, dashboard: 'wip' },
  { id: 'def-14', name: 'conditional_approval', label: 'Conditional Approval', color: '#14b8a6', display_order: 13, dashboard: 'wip' },
  { id: 'def-15', name: 'formal_approval', label: 'Formal Approval', color: '#10b981', display_order: 14, dashboard: 'wip' },
  { id: 'def-16', name: 'loan_docs_issued', label: 'Loan Docs Issued', color: '#06b6d4', display_order: 15, dashboard: 'wip' },
  { id: 'def-17', name: 'loan_docs_returned', label: 'Loan Docs Returned to Lender', color: '#0891b2', display_order: 16, dashboard: 'wip' },
  { id: 'def-18', name: 'loan_docs_certified', label: 'Loan Docs Certified', color: '#0e7490', display_order: 17, dashboard: 'wip' },
  { id: 'def-19', name: 'pending_settlement_conditions', label: 'Pending Settlement Conditions', color: '#d97706', display_order: 18, dashboard: 'wip' },
  { id: 'def-20', name: 'pending_settlement', label: 'Pending Settlement', color: '#ca8a04', display_order: 19, dashboard: 'wip' },
  { id: 'def-21', name: 'settled', label: 'Settled', color: '#22c55e', display_order: 20, dashboard: 'settled' },
];

export function useWipStatuses() {
  const { isPreviewMode } = useAuth();
  const [statuses, setStatuses] = useState<WipStatus[]>(DEFAULT_WIP_STATUSES);
  const [loading, setLoading] = useState(true);

  const fetchStatuses = useCallback(async () => {
    if (isPreviewMode) {
      setStatuses(DEFAULT_WIP_STATUSES);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('wip_statuses')
      .select('*')
      .order('display_order', { ascending: true });
    if (data && data.length > 0) {
      setStatuses(data);
    }
    setLoading(false);
  }, [isPreviewMode]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const addStatus = async (name: string, label: string, color: string, dashboard: string = 'wip') => {
    if (isPreviewMode) {
      setStatuses(prev => [...prev, { id: `preview-${Date.now()}`, name, label, color, display_order: prev.length, amber_after_days: 4, red_after_days: 7, dashboard }]);
      return true;
    }
    const { error } = await supabase.from('wip_statuses').insert({
      name, label, color, display_order: statuses.length, dashboard,
    });
    if (error) return false;
    await fetchStatuses();
    return true;
  };

  const updateStatus = async (id: string, updates: Partial<Pick<WipStatus, 'label' | 'color' | 'name' | 'amber_after_days' | 'red_after_days' | 'dashboard'>>) => {
    if (isPreviewMode) {
      setStatuses(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      return true;
    }
    if (updates.name) {
      const oldStatus = statuses.find(s => s.id === id);
      if (oldStatus && oldStatus.name !== updates.name) {
        // Preserve each deal's stage timer: renaming a stage is not a stage change.
        const { data: affected } = await supabase
          .from('leads')
          .select('id, stage_entered_at')
          .eq('wip_status', oldStatus.name);
        await (supabase.rpc as any)('rename_lead_status', { _kind: 'wip', _old: oldStatus.name, _new: updates.name });
        await Promise.all(
          ((affected as any[]) || [])
            .filter(l => l.stage_entered_at)
            .map(l => supabase.from('leads').update({ stage_entered_at: l.stage_entered_at }).eq('id', l.id))
        );
      }
    }
    const { error } = await supabase.from('wip_statuses').update(updates).eq('id', id);
    if (error) return false;
    await fetchStatuses();
    return true;
  };

  const deleteStatus = async (id: string) => {
    if (isPreviewMode) {
      setStatuses(prev => prev.filter(s => s.id !== id));
      return true;
    }
    const { error } = await supabase.from('wip_statuses').delete().eq('id', id);
    if (error) return false;
    await fetchStatuses();
    return true;
  };

  const reorderStatuses = async (reordered: WipStatus[]) => {
    setStatuses(reordered);
    if (isPreviewMode) return true;
    const updates = reordered.map((s, i) =>
      supabase.from('wip_statuses').update({ display_order: i }).eq('id', s.id)
    );
    const results = await Promise.all(updates);
    const failed = results.some(result => result.error);
    if (failed) {
      await fetchStatuses();
      return false;
    }
    return true;
  };

  return { statuses, loading, addStatus, updateStatus, deleteStatus, reorderStatuses, refetch: fetchStatuses };
}