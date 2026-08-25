import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2 } from 'lucide-react';

export interface DealOption {
  id: string;
  name: string;
  stage: string;
  isWip: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  saving?: boolean;
  onConfirm: (deal: DealOption, scenarioName: string) => void;
}

/** Pick a Lead or WIP deal to attach the current funding position to. */
export function SaveToDealDialog({ open, onOpenChange, defaultName, saving, onConfirm }: Props) {
  const [deals, setDeals] = useState<DealOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [name, setName] = useState(defaultName);
  const [selected, setSelected] = useState<DealOption | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setSelected(null);
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, first_name, last_name, opportunity_name, status, wip_status')
        .order('updated_at', { ascending: false })
        .limit(300);
      setDeals(
        ((data as any[]) ?? []).map(l => ({
          id: l.id as string,
          name:
            (l.opportunity_name as string) ||
            [l.first_name, l.last_name].filter(Boolean).join(' ') ||
            'Untitled deal',
          stage: (l.wip_status as string) || (l.status as string) || '—',
          isWip: Boolean(l.wip_status),
        })),
      );
      setLoading(false);
    })();
  }, [open, defaultName]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? deals.filter(d => d.name.toLowerCase().includes(q)) : deals;
  }, [deals, query]);

  const groups: Array<[string, DealOption[]]> = [
    ['WIP', filtered.filter(d => d.isWip)],
    ['Leads', filtered.filter(d => !d.isWip)],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Save funding position to a deal</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Scenario name</label>
            <Input value={name} onChange={e => setName(e.target.value.slice(0, 80))} placeholder="Scenario name" />
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search deals…"
              className="pl-8"
            />
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border divide-y">
            {loading && (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading deals…
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">No deals match that search.</p>
            )}
            {!loading &&
              groups.map(([label, items]) =>
                items.length ? (
                  <div key={label}>
                    <p className="bg-muted/50 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {label}
                    </p>
                    {items.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelected(d)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 ${
                          selected?.id === d.id ? 'bg-primary/10' : ''
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">{d.name}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {String(d.stage).replace(/_/g, ' ')}
                        </Badge>
                      </button>
                    ))}
                  </div>
                ) : null,
              )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selected || saving}
              onClick={() => selected && onConfirm(selected, name.trim() || defaultName)}
            >
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Save to deal
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            The scenario appears in that deal's Funds Position tab and a note is added to its timeline.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
