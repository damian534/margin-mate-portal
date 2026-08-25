import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { LenderLmiProfile, LmiProviderKey, RateTable } from '@/lib/fundsPosition/lmiProviders';

export interface LenderWithLmi extends LenderLmiProfile {
  lenderId: string;
  lenderName: string;
  isAccredited: boolean;
}

const toProfile = (row: any): LenderWithLmi => ({
  lenderId: row.id,
  lenderName: row.name,
  isAccredited: !!row.is_accredited,
  provider: (row.lmi_provider ?? 'generic') as LmiProviderKey,
  multiplier: Number(row.lmi_multiplier ?? 1) || 1,
  maxLvr: Number(row.lmi_max_lvr ?? 95) || 95,
  maxCapitalisedLvr: Number(row.lmi_max_capitalised_lvr ?? 97) || 97,
  waiverMaxLvr: row.lmi_waiver_max_lvr == null ? null : Number(row.lmi_waiver_max_lvr),
  waiverNotes: row.lmi_waiver_notes ?? null,
  customTable: (row.lmi_rate_table as RateTable | null) ?? null,
  notes: row.lmi_notes ?? null,
});

/** Lenders for the current broker with their LMI pricing profile. */
export function useLenderLmi(accreditedOnly = true) {
  const { effectiveBrokerId } = useAuth();
  const [lenders, setLenders] = useState<LenderWithLmi[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('lenders').select('*').order('name');
    if (effectiveBrokerId) q = q.eq('broker_id', effectiveBrokerId);
    const { data } = await q;
    const rows = (data ?? []).map(toProfile);
    setLenders(accreditedOnly ? rows.filter(l => l.isAccredited) : rows);
    setLoading(false);
  }, [effectiveBrokerId, accreditedOnly]);

  useEffect(() => { load(); }, [load]);

  return { lenders, loading, reload: load };
}
