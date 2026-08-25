import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { downloadFundsPositionPdf } from '@/lib/pdf/fundsPositionPdf';
import type { SavedFundsScenario } from './useFundsScenarios';
import type { FundsPositionInputs, FundsPositionResult } from '@/lib/fundsPosition/types';

const money = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n || 0)).toLocaleString('en-AU')}`;

interface Column {
  id: string;
  name: string;
  inputs: FundsPositionInputs;
  result: FundsPositionResult;
  saved: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: SavedFundsScenario[];
  current: { inputs: FundsPositionInputs; result: FundsPositionResult };
  clientName?: string;
  onLoad: (inputs: FundsPositionInputs) => void;
  onDelete: (id: string) => void;
}

const METRICS: Array<{ label: string; get: (c: Column) => string; tone?: (c: Column) => string }> = [
  { label: 'Property value', get: c => money(c.result.propertyValue) },
  { label: 'Base loan', get: c => money(c.result.baseLoan) },
  { label: 'Total loan', get: c => money(c.result.totalLoan) },
  { label: 'Base LVR', get: c => `${c.result.baseLVR.toFixed(2)}%` },
  { label: 'Total LVR', get: c => `${c.result.totalLVR.toFixed(2)}%` },
  { label: 'LMI (incl. duty)', get: c => money(c.result.lmi + c.result.lmiStampDuty) },
  { label: 'Government charges', get: c => money(c.result.govCharges) },
  { label: 'Fees', get: c => money(c.result.fees) },
  { label: 'Funds required', get: c => money(c.result.fundsRequired) },
  { label: 'Funds available', get: c => money(c.result.fundsAvailable) },
  {
    label: 'Surplus / (shortfall)',
    get: c => money(c.result.netSurplus),
    tone: c => (c.result.netSurplus < 0 ? 'text-destructive' : 'text-success'),
  },
  { label: 'Monthly repayment', get: c => money(c.result.repayment) },
];

export function FundsScenarioCompare({
  open,
  onOpenChange,
  scenarios,
  current,
  clientName,
  onLoad,
  onDelete,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  const columns = useMemo<Column[]>(() => {
    const chosen = scenarios
      .filter(s => selected.includes(s.id))
      .map(s => ({ id: s.id, name: s.name, inputs: s.inputs, result: s.result, saved: true }));
    return [
      { id: '__current', name: 'Current', inputs: current.inputs, result: current.result, saved: false },
      ...chosen,
    ];
  }, [scenarios, selected, current]);

  const toggle = (id: string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const exportComparison = async () => {
    try {
      await downloadFundsPositionPdf(
        current.inputs,
        current.result,
        { clientName, scenarioName: 'Comparison' },
        [],
        columns.map(c => ({ name: c.name, inputs: c.inputs, result: c.result })),
      );
    } catch {
      toast.error('Could not generate the comparison PDF');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare funding scenarios</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">Saved scenarios</p>
            {scenarios.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No saved scenarios yet — save the current position to start comparing.
              </p>
            )}
            <div className="grid gap-1.5 sm:grid-cols-2">
              {scenarios.map(s => (
                <div key={s.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                  <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString('en-AU')} · {money(s.result.netSurplus)}{' '}
                      {s.result.netSurplus < 0 ? 'shortfall' : 'surplus'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onLoad(s.inputs);
                      onOpenChange(false);
                      toast.success(`Loaded "${s.name}"`);
                    }}
                  >
                    Load
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(s.id)} aria-label="Delete scenario">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="p-2 text-left font-medium">Metric</th>
                  {columns.map(c => (
                    <th key={c.id} className="p-2 text-right font-medium whitespace-nowrap">
                      {c.name}
                      {!c.saved && (
                        <Badge variant="secondary" className="ml-1 text-[10px]">
                          Live
                        </Badge>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map(m => (
                  <tr key={m.label} className="border-b last:border-0">
                    <td className="p-2 text-muted-foreground">{m.label}</td>
                    {columns.map(c => (
                      <td key={c.id} className={`p-2 text-right tabular-nums ${m.tone?.(c) ?? ''}`}>
                        {m.get(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={exportComparison}>
              <Download className="mr-1 h-4 w-4" /> Export comparison PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
