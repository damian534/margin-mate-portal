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

const money = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n || 0)).toLocaleString('en-AU')}`;

/** Saved funding-position scenarios for the signed-in broker, optionally scoped to a deal. */
export function useFundsScenarios(leadId?: string | null, enabled = true) {
  const [allScenarios, setAllScenarios] = useState<SavedFundsScenario[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tool_scenarios')
      .select('id, inputs, outputs, created_at')
      .eq('tool_name', FUNDS_TOOL_NAME)
      .order('created_at', { ascending: false })
      .limit(200);
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

    setAllScenarios(rows);
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (
      name: string,
      inputs: FundsPositionInputs,
      result: FundsPositionResult,
      options?: { leadId?: string | null; addNote?: boolean },
    ) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error('Not signed in');

      const targetLead = options?.leadId !== undefined ? options.leadId : leadId ?? null;

      const { error } = await supabase.from('tool_scenarios').insert({
        user_id: userId,
        tool_name: FUNDS_TOOL_NAME,
        inputs: { name, leadId: targetLead, inputs } as any,
        outputs: result as any,
      } as any);
      if (error) throw error;

      if (targetLead && options?.addNote) {
        await supabase.from('notes').insert({
          lead_id: targetLead,
          author_id: userId,
          content:
            `💰 Funding position saved — "${name}" · Property ${money(result.propertyValue)} · ` +
            `Loan ${money(result.totalLoan)} (${result.totalLVR.toFixed(2)}% LVR) · ` +
            `${result.netSurplus < 0 ? 'Shortfall' : 'Surplus'} ${money(Math.abs(result.netSurplus))}`,
        } as any);
      }

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

  const scenarios = leadId ? allScenarios.filter(s => s.leadId === leadId) : allScenarios;

  return { scenarios, allScenarios, loading, load, save, remove };
}
