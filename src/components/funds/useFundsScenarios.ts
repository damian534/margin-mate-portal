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
  /** 1 = first save, incrementing with every re-save under the same name. */
  version: number;
}

/** All versions saved under one scenario name (newest first). */
export interface FundsScenarioGroup {
  key: string;
  name: string;
  leadId: string | null;
  latest: SavedFundsScenario;
  versions: SavedFundsScenario[];
}

const money = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n || 0)).toLocaleString('en-AU')}`;

export const scenarioGroupKey = (s: { name: string; leadId: string | null }) =>
  `${s.leadId ?? 'none'}::${s.name.trim().toLowerCase()}`;

/** Groups saved rows into version histories, newest version first. */
export function groupFundsScenarios(rows: SavedFundsScenario[]): FundsScenarioGroup[] {
  const map = new Map<string, SavedFundsScenario[]>();
  rows.forEach(s => {
    const key = scenarioGroupKey(s);
    map.set(key, [...(map.get(key) ?? []), s]);
  });

  return Array.from(map.entries())
    .map(([key, list]) => {
      const versions = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const total = versions.length;
      versions.forEach((v, idx) => {
        v.version = total - idx;
      });
      return { key, name: versions[0].name, leadId: versions[0].leadId, latest: versions[0], versions };
    })
    .sort(
      (a, b) =>
        new Date(b.latest.createdAt).getTime() - new Date(a.latest.createdAt).getTime(),
    );
}


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
