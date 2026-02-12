import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LeadStatus {
  id: string;
  name: string;
  label: string;
  color: string;
  display_order: number;
}

const DEFAULT_STATUSES: LeadStatus[] = [
  { id: 'def-1', name: 'new', label: 'New', color: '#6b7280', display_order: 0 },
  { id: 'def-2', name: 'contacted', label: 'Contacted', color: '#3b82f6', display_order: 1 },
  { id: 'def-3', name: 'in_progress', label: 'In Progress', color: '#f59e0b', display_order: 2 },
  { id: 'def-4', name: 'qualified', label: 'Qualified', color: '#8b5cf6', display_order: 3 },
  { id: 'def-5', name: 'approved', label: 'Approved', color: '#10b981', display_order: 4 },
  { id: 'def-6', name: 'settled', label: 'Settled', color: '#22c55e', display_order: 5 },
  { id: 'def-7', name: 'lost', label: 'Lost', color: '#ef4444', display_order: 6 },
];

export function useLeadStatuses() {
  const { isPreviewMode } = useAuth();
  const [statuses, setStatuses] = useState<LeadStatus[]>(DEFAULT_STATUSES);
  const [loading, setLoading] = useState(true);

  const fetchStatuses = async () => {
    if (isPreviewMode) {
      setStatuses(DEFAULT_STATUSES);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('lead_statuses')
      .select('*')
      .order('display_order', { ascending: true });
    if (data && data.length > 0) {
      setStatuses(data as LeadStatus[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatuses();
  }, [isPreviewMode]);

  const getStatusConfig = (statusName: string) => {
    return statuses.find(s => s.name === statusName) || statuses[0] || DEFAULT_STATUSES[0];
  };

  const addStatus = async (name: string, label: string, color: string) => {
    if (isPreviewMode) {
      const newStatus: LeadStatus = {
        id: `preview-${Date.now()}`,
        name,
        label,
        color,
        display_order: statuses.length,
      };
      setStatuses(prev => [...prev, newStatus]);
      return true;
    }
    const { error } = await supabase.from('lead_statuses').insert({
      name,
      label,
      color,
      display_order: statuses.length,
    });
    if (error) return false;
    await fetchStatuses();
    return true;
  };

  const updateStatus = async (id: string, updates: Partial<Pick<LeadStatus, 'label' | 'color' | 'name'>>) => {
    if (isPreviewMode) {
      setStatuses(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      return true;
    }
    const { error } = await supabase.from('lead_statuses').update(updates).eq('id', id);
    if (error) return false;
    await fetchStatuses();
    return true;
  };

  const deleteStatus = async (id: string) => {
    if (isPreviewMode) {
      setStatuses(prev => prev.filter(s => s.id !== id));
      return true;
    }
    const { error } = await supabase.from('lead_statuses').delete().eq('id', id);
    if (error) return false;
    await fetchStatuses();
    return true;
  };

  const reorderStatuses = async (reordered: LeadStatus[]) => {
    setStatuses(reordered);
    if (isPreviewMode) return true;
    const updates = reordered.map((s, i) =>
      supabase.from('lead_statuses').update({ display_order: i }).eq('id', s.id)
    );
    await Promise.all(updates);
    return true;
  };

  return { statuses, loading, getStatusConfig, addStatus, updateStatus, deleteStatus, reorderStatuses, refetch: fetchStatuses };
}
