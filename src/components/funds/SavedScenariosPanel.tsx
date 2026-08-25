import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Columns3, Trash2, FolderOpen } from 'lucide-react';
import type { SavedFundsScenario } from './useFundsScenarios';

const money = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n || 0)).toLocaleString('en-AU')}`;

interface Props {
  scenarios: SavedFundsScenario[];
  onLoad: (s: SavedFundsScenario) => void;
  onDelete: (id: string) => void;
  onCompare: () => void;
  /** Hide the deal column when already inside a deal. */
  hideDeal?: boolean;
}

/** Dedicated list of every saved funding position, with the deal it belongs to. */
export function SavedScenariosPanel({ scenarios, onLoad, onDelete, onCompare, hideDeal }: Props) {
  const [dealNames, setDealNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = Array.from(new Set(scenarios.map(s => s.leadId).filter(Boolean))) as string[];
    if (hideDeal || ids.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, first_name, last_name, opportunity_name')
        .in('id', ids);
      const map: Record<string, string> = {};
      ((data as any[]) ?? []).forEach(l => {
        map[l.id] =
          l.opportunity_name || [l.first_name, l.last_name].filter(Boolean).join(' ') || 'Deal';
      });
      setDealNames(map);
    })();
  }, [scenarios, hideDeal]);

  return (
    <section className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <FolderOpen className="h-4 w-4 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Saved funding positions</p>
          <p className="text-[11px] text-muted-foreground">
            {scenarios.length} saved {scenarios.length === 1 ? 'scenario' : 'scenarios'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onCompare}>
          <Columns3 className="mr-1 h-4 w-4" /> Compare
        </Button>
      </div>

      {scenarios.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Nothing saved yet — use <strong>Save</strong> or <strong>Save to deal</strong> to keep a position.
        </p>
      ) : (
        <div className="divide-y">
          {scenarios.map(s => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(s.createdAt).toLocaleDateString('en-AU')} · Loan {money(s.result.totalLoan)} ·{' '}
                  {s.result.totalLVR.toFixed(2)}% LVR ·{' '}
                  <span className={s.result.netSurplus < 0 ? 'text-destructive' : 'text-success'}>
                    {money(Math.abs(s.result.netSurplus))} {s.result.netSurplus < 0 ? 'shortfall' : 'surplus'}
                  </span>
                </p>
              </div>
              {!hideDeal && (
                <Badge variant={s.leadId ? 'secondary' : 'outline'} className="text-[10px]">
                  {s.leadId ? dealNames[s.leadId] ?? 'Deal' : 'No deal'}
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={() => onLoad(s)}>
                Load
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(s.id)} aria-label="Delete scenario">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
