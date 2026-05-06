import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, subMonths, format, parseISO } from 'date-fns';

export interface Settlement {
  id: string;
  broker_id: string;
  lending_assistant_id: string | null;
  client_name: string;
  settlement_date: string;
  status: string;
  loan_amount: number;
  lender: string | null;
  application_type: string | null;
  lead_source: string | null;
  security_address: string | null;
  discharge_completed: boolean;
  pre_settlement_check_completed: boolean;
  contact_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementFilters {
  month: string;
  dateFrom: string;
  dateTo: string;
  brokerId: string;
  lendingAssistant: string;
  lender: string;
  applicationType: string;
  leadSource: string;
  status: string;
}

const defaultFilters: SettlementFilters = {
  month: '',
  dateFrom: '',
  dateTo: '',
  brokerId: 'all',
  lendingAssistant: 'all',
  lender: 'all',
  applicationType: 'all',
  leadSource: 'all',
  status: 'all',
};

export function useSettlements() {
  const { user, role, isPreviewMode } = useAuth();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SettlementFilters>(defaultFilters);

  const isSuperAdmin = role === 'super_admin';

  const fetchSettlements = useCallback(async () => {
    if (isPreviewMode) {
      setSettlements(generateSampleSettlements());
      setLoading(false);
      return;
    }
    setLoading(true);
    const [settlementsRes, estimatedRes] = await Promise.all([
      supabase.from('settlements').select('*').order('settlement_date', { ascending: false }),
      supabase
        .from('leads')
        .select('id, broker_id, first_name, last_name, loan_amount, estimated_settlement_date, settled_date, source')
        .not('estimated_settlement_date', 'is', null)
        .is('settled_date', null),
    ]);
    if (settlementsRes.error) {
      console.error('Error fetching settlements:', settlementsRes.error);
      toast.error('Failed to load settlements');
    }
    const real = (settlementsRes.data as Settlement[]) || [];
    const estimated: Settlement[] = ((estimatedRes.data as any[]) || []).map((l) => ({
      id: `estimated-${l.id}`,
      broker_id: l.broker_id || '',
      lending_assistant_id: null,
      client_name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Lead',
      settlement_date: l.estimated_settlement_date,
      status: 'estimated',
      loan_amount: Number(l.loan_amount) || 0,
      lender: null,
      application_type: null,
      lead_source: l.source || null,
      security_address: null,
      discharge_completed: false,
      pre_settlement_check_completed: false,
      contact_name: null,
      notes: 'Auto-generated from lead estimated settlement date',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    setSettlements([...real, ...estimated]);
    setLoading(false);
  }, [isPreviewMode]);

  useEffect(() => { fetchSettlements(); }, [fetchSettlements]);

  const filtered = useMemo(() => {
    let result = settlements;

    if (filters.brokerId !== 'all') {
      result = result.filter(s => s.broker_id === filters.brokerId);
    }
    if (filters.status !== 'all') {
      result = result.filter(s => s.status === filters.status);
    }
    if (filters.lender !== 'all') {
      result = result.filter(s => s.lender === filters.lender);
    }
    if (filters.applicationType !== 'all') {
      result = result.filter(s => s.application_type === filters.applicationType);
    }
    if (filters.leadSource !== 'all') {
      result = result.filter(s => s.lead_source === filters.leadSource);
    }
    if (filters.lendingAssistant !== 'all') {
      result = result.filter(s => s.lending_assistant_id === filters.lendingAssistant);
    }
    if (filters.month) {
      const [year, month] = filters.month.split('-').map(Number);
      result = result.filter(s => {
        const d = parseISO(s.settlement_date);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });
    }
    if (filters.dateFrom) {
      result = result.filter(s => s.settlement_date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      result = result.filter(s => s.settlement_date <= filters.dateTo);
    }

    return result;
  }, [settlements, filters]);

  const kpis = useMemo(() => {
    const settled = filtered.filter(s => s.status === 'settled');
    const pending = filtered.filter(s => s.status !== 'settled');
    const totalSettledVolume = settled.reduce((sum, s) => sum + Number(s.loan_amount), 0);
    const totalPendingVolume = pending.reduce((sum, s) => sum + Number(s.loan_amount), 0);
    const avgLoanSize = settled.length > 0 ? totalSettledVolume / settled.length : 0;
    const totalDeals = filtered.length;

    const purchaseCount = settled.filter(s => s.application_type === 'purchase').length;
    const refinanceCount = settled.filter(s => s.application_type === 'refinance').length;
    const totalTyped = purchaseCount + refinanceCount;
    const purchasePct = totalTyped > 0 ? Math.round((purchaseCount / totalTyped) * 100) : 0;
    const refinancePct = totalTyped > 0 ? 100 - purchasePct : 0;

    // Top lender
    const lenderCounts: Record<string, number> = {};
    settled.forEach(s => { if (s.lender) lenderCounts[s.lender] = (lenderCounts[s.lender] || 0) + 1; });
    const topLender = Object.entries(lenderCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Top source
    const sourceCounts: Record<string, number> = {};
    settled.forEach(s => { if (s.lead_source) sourceCounts[s.lead_source] = (sourceCounts[s.lead_source] || 0) + 1; });
    const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // MoM growth
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const thisMonthVol = settled.filter(s => {
      const d = parseISO(s.settlement_date);
      return d >= thisMonthStart && d <= thisMonthEnd;
    }).reduce((sum, s) => sum + Number(s.loan_amount), 0);

    const lastMonthVol = settled.filter(s => {
      const d = parseISO(s.settlement_date);
      return d >= lastMonthStart && d <= lastMonthEnd;
    }).reduce((sum, s) => sum + Number(s.loan_amount), 0);

    const momGrowth = lastMonthVol > 0 ? ((thisMonthVol - lastMonthVol) / lastMonthVol) * 100 : 0;

    return {
      totalSettledVolume,
      totalPendingVolume,
      settledCount: settled.length,
      avgLoanSize,
      totalDeals,
      purchasePct,
      refinancePct,
      topLender,
      topSource,
      momGrowth,
    };
  }, [filtered]);

  // Unique values for filters
  const filterOptions = useMemo(() => ({
    lenders: [...new Set(settlements.map(s => s.lender).filter(Boolean))] as string[],
    applicationTypes: [...new Set(settlements.map(s => s.application_type).filter(Boolean))] as string[],
    leadSources: [...new Set(settlements.map(s => s.lead_source).filter(Boolean))] as string[],
    statuses: [...new Set(settlements.map(s => s.status))] as string[],
  }), [settlements]);

  const addSettlement = async (data: Omit<Settlement, 'id' | 'created_at' | 'updated_at'>) => {
    if (isPreviewMode) {
      const newS: Settlement = { ...data, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      setSettlements(prev => [newS, ...prev]);
      toast.success('Settlement added (preview)');
      return;
    }
    const { error } = await supabase.from('settlements').insert(data as any);
    if (error) { toast.error('Failed to add settlement'); console.error(error); return; }
    toast.success('Settlement added');
    fetchSettlements();
  };

  const updateSettlement = async (id: string, updates: Partial<Settlement>) => {
    if (isPreviewMode) {
      setSettlements(prev => prev.map(s => s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s));
      toast.success('Settlement updated (preview)');
      return;
    }
    const { error } = await supabase.from('settlements').update(updates as any).eq('id', id);
    if (error) { toast.error('Failed to update settlement'); console.error(error); return; }
    toast.success('Settlement updated');
    fetchSettlements();
  };

  const deleteSettlement = async (id: string) => {
    if (isPreviewMode) {
      setSettlements(prev => prev.filter(s => s.id !== id));
      toast.success('Settlement deleted (preview)');
      return;
    }
    const { error } = await supabase.from('settlements').delete().eq('id', id);
    if (error) { toast.error('Failed to delete settlement'); console.error(error); return; }
    toast.success('Settlement deleted');
    fetchSettlements();
  };

  const updateFilter = (key: keyof SettlementFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => setFilters(defaultFilters);

  return { settlements: filtered, allSettlements: settlements, loading, kpis, filters, filterOptions, updateFilter, resetFilters, addSettlement, updateSettlement, deleteSettlement, isSuperAdmin, refetch: fetchSettlements };
}

function generateSampleSettlements(): Settlement[] {
  const lenders = ['CBA', 'Westpac', 'ANZ', 'NAB', 'Macquarie', 'ING', 'Bankwest'];
  const types = ['purchase', 'refinance', 'top_up', 'purchase_refinance'];
  const sources = ['Referral Partner', 'Google', 'Existing Client', 'Direct Call', 'Instagram'];
  const statuses = ['settled', 'booked', 'docs_issue', 'docs_returned', 'pending_approval'];
  const names = ['James Wilson', 'Sarah Chen', 'Michael Brown', 'Emily Davis', 'David Kim', 'Jessica Taylor', 'Ryan Martinez', 'Amanda Nguyen', 'Chris Johnson', 'Lauren Scott', 'Mark Thompson', 'Nicole Harris'];

  return names.map((name, i) => ({
    id: `sample-${i}`,
    broker_id: 'preview-user-id',
    lending_assistant_id: null,
    client_name: name,
    settlement_date: new Date(2026, 1 - Math.floor(i / 4), 15 - i).toISOString().split('T')[0],
    status: statuses[i % statuses.length],
    loan_amount: 450000 + Math.floor(Math.random() * 800000),
    lender: lenders[i % lenders.length],
    application_type: types[i % types.length],
    lead_source: sources[i % sources.length],
    security_address: `${10 + i} Market St, Sydney NSW 2000`,
    discharge_completed: i % 3 === 0,
    pre_settlement_check_completed: i % 2 === 0,
    contact_name: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}
