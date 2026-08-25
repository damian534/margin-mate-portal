import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateFundsPosition } from '@/lib/fundsPosition/calc';
import type { FundsPositionInputs, FundsPositionResult } from '@/lib/fundsPosition/types';

export const FUNDS_TOOL_NAME = 'funds_position';

export interface SavedFundsScenario {
  id: string;
  name: string;
  leadId: string | null;
  createdAt: string;
  inputs: FundsPositionInputs;
  result: FundsPositionResult;
}

/** Saved funding-position scenarios for the signed-in broker, optionally scoped to a deal. */
export function useFundsScenarios(leadId?: string | null, enabled = true) {
  const [scenarios, setScenarios] = useState<SavedFundsScenario[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tool_scenarios')
      .select('id, inputs, outputs, created_at')
      .eq('tool_name', FUNDS_TOOL_NAME)
      .order('created_at', { ascending: false })
      .limit(100);
    setLoading(false);
    if (error || !data) return;

    const rows = (data as any[])
      .map(row => {
        const payload = (row.inputs ?? {}) as any;
        const inputs = payload.inputs as FundsPositionInputs | undefined;
        if (!inputs) return null;
        return {
          id: row.id as string,
          name: (payload.name as string) || 'Untitled scenario',
          leadId: (payload.leadId as string) ?? null,
          createdAt: row.created_at as string,
          inputs,
          result: (row.outputs as FundsPositionResult) ?? calculateFundsPosition(inputs),
        } as SavedFundsScenario;
      })
      .filter(Boolean) as SavedFundsScenario[];

    setScenarios(leadId ? rows.filter(s => s.leadId === leadId) : rows);
  }, [enabled, leadId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (name: string, inputs: FundsPositionInputs, result: FundsPositionResult) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error('Not signed in');
      const { error } = await supabase.from('tool_scenarios').insert({
        user_id: userId,
        tool_name: FUNDS_TOOL_NAME,
        inputs: { name, leadId: leadId ?? null, inputs } as any,
        outputs: result as any,
      } as any);
      if (error) throw error;
      await load();
    },
    [leadId, load],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('tool_scenarios').delete().eq('id', id);
      if (error) throw error;
      await load();
    },
    [load],
  );

  return { scenarios, loading, load, save, remove };
}
