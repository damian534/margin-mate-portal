import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface WipStatus {
  id: string;
  name: string;
  label: string;
  color: string;
  display_order: number;
}

const DEFAULT_WIP_STATUSES: WipStatus[] = [
  { id: 'def-1', name: 'pending_fact_find', label: 'Pending Fact Find', color: '#cbd5e1', display_order: 0 },
  { id: 'def-2', name: 'onboarding', label: 'Onboarding', color: '#94a3b8', display_order: 1 },
  { id: 'def-3', name: 'pending_additional_docs', label: 'Pending Additional Documents', color: '#84cc16', display_order: 2 },
  { id: 'def-4', name: 'sent_for_onboarding', label: 'Sent for Onboarding', color: '#7c9eb2', display_order: 3 },
  { id: 'def-5', name: 'researching', label: 'Researching', color: '#64748b', display_order: 4 },
  { id: 'def-6', name: 'proposal_sent', label: 'Proposal Sent', color: '#0ea5e9', display_order: 5 },
  { id: 'def-7', name: 'new_application', label: 'New Application', color: '#3b82f6', display_order: 6 },
  { id: 'def-8', name: 'app_sent_signing', label: 'Application Sent for Signing', color: '#6366f1', display_order: 7 },
  { id: 'def-9', name: 'lodged', label: 'Lodged', color: '#8b5cf6', display_order: 8 },
  { id: 'def-10', name: 'preapproved', label: 'Preapproved', color: '#a855f7', display_order: 9 },
  { id: 'def-11', name: 'mir_issued', label: 'MIR Issued', color: '#f59e0b', display_order: 10 },
  { id: 'def-12', name: 'mir_resolved', label: 'MIR Resolved', color: '#eab308', display_order: 11 },
  { id: 'def-13', name: 'aip_not_lodged', label: 'AIP > Full Not Yet Lodged', color: '#f97316', display_order: 12 },
  { id: 'def-14', name: 'conditional_approval', label: 'Conditional Approval', color: '#14b8a6', display_order: 13 },
  { id: 'def-15', name: 'formal_approval', label: 'Formal Approval', color: '#10b981', display_order: 14 },
  { id: 'def-16', name: 'loan_docs_issued', label: 'Loan Docs Issued', color: '#06b6d4', display_order: 15 },
  { id: 'def-17', name: 'loan_docs_returned', label: 'Loan Docs Returned to Lender', color: '#0891b2', display_order: 16 },
  { id: 'def-18', name: 'loan_docs_certified', label: 'Loan Docs Certified', color: '#0e7490', display_order: 17 },
  { id: 'def-19', name: 'pending_settlement_conditions', label: 'Pending Settlement Conditions', color: '#d97706', display_order: 18 },
  { id: 'def-20', name: 'pending_settlement', label: 'Pending Settlement', color: '#ca8a04', display_order: 19 },
  { id: 'def-21', name: 'settled', label: 'Settled', color: '#22c55e', display_order: 20 },
];

export function useWipStatuses() {
  const { isPreviewMode } = useAuth();
  const [statuses, setStatuses] = useState<WipStatus[]>(DEFAULT_WIP_STATUSES);
  const [loading, setLoading] = useState(true);

  const fetchStatuses = async () => {
    if (isPreviewMode) {
      setStatuses(DEFAULT_WIP_STATUSES);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('wip_statuses' as any)
      .select('*')
      .order('display_order', { ascending: true });
    if (data && (data as any[]).length > 0) {
      setStatuses(data as unknown as WipStatus[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatuses();
  }, [isPreviewMode]);

  const addStatus = async (name: string, label: string, color: string) => {
    if (isPreviewMode) {
      setStatuses(prev => [...prev, { id: `preview-${Date.now()}`, name, label, color, display_order: prev.length }]);
      return true;
    }
    const { error } = await supabase.from('wip_statuses' as any).insert({
      name, label, color, display_order: statuses.length,
    } as any);
    if (error) return false;
    await fetchStatuses();
    return true;
  };

  const updateStatus = async (id: string, updates: Partial<Pick<WipStatus, 'label' | 'color' | 'name'>>) => {
    if (isPreviewMode) {
      setStatuses(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      return true;
    }
    if (updates.name) {
      const oldStatus = statuses.find(s => s.id === id);
      if (oldStatus && oldStatus.name !== updates.name) {
        await supabase.from('leads').update({ wip_status: updates.name } as any).eq('wip_status', oldStatus.name);
      }
    }
    const { error } = await supabase.from('wip_statuses' as any).update(updates as any).eq('id', id);
    if (error) return false;
    await fetchStatuses();
    return true;
  };

  const deleteStatus = async (id: string) => {
    if (isPreviewMode) {
      setStatuses(prev => prev.filter(s => s.id !== id));
      return true;
    }
    const { error } = await supabase.from('wip_statuses' as any).delete().eq('id', id);
    if (error) return false;
    await fetchStatuses();
    return true;
  };

  const reorderStatuses = async (reordered: WipStatus[]) => {
    setStatuses(reordered);
    if (isPreviewMode) return true;
    const updates = reordered.map((s, i) =>
      supabase.from('wip_statuses' as any).update({ display_order: i } as any).eq('id', s.id)
    );
    await Promise.all(updates);
    return true;
  };

  return { statuses, loading, addStatus, updateStatus, deleteStatus, reorderStatuses, refetch: fetchStatuses };
}