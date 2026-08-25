import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, History, RotateCcw, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { downloadFundsPositionPdf } from '@/lib/pdf/fundsPositionPdf';
import type { FundsScenarioGroup, SavedFundsScenario } from './useFundsScenarios';

const money = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n || 0)).toLocaleString('en-AU')}`;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: FundsScenarioGroup | null;
  clientName?: string;
  /** Load the version into the calculator (no write). */
  onLoad?: (s: SavedFundsScenario) => void;
  /** Roll back — re-saves the chosen version as the newest one. */
  onRestore?: (s: SavedFundsScenario) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
}

/** Full version history for one saved funding position. */
export function ScenarioVersionsDialog({
  open,
  onOpenChange,
  group,
  clientName,
  onLoad,
  onRestore,
  onDelete,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  const exportPdf = async (s: SavedFundsScenario) => {
    try {
      await downloadFundsPositionPdf(s.inputs, s.result, {
        clientName,
        scenarioName: `${s.name} v${s.version}`,
      });
      toast.success('PDF downloaded');
    } catch {
      toast.error('Could not generate the PDF');
    }
  };

  const restore = async (s: SavedFundsScenario) => {
    if (!onRestore) return;
    setBusy(s.id);
    try {
      await onRestore(s);
      toast.success(`Rolled back to v${s.version}`);
      onOpenChange(false);
    } catch {
      toast.error('Could not roll back');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Version history{group ? ` — ${group.name}` : ''}
          </DialogTitle>
        </DialogHeader>

        {!group || group.versions.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No versions saved yet.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {group.versions.map((v, idx) => {
              const prev = group.versions[idx + 1];
              const loanDelta = prev ? v.result.totalLoan - prev.result.totalLoan : 0;
              const lvrDelta = prev ? v.result.totalLVR - prev.result.totalLVR : 0;
              return (
                <div key={v.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                  <Badge variant={idx === 0 ? 'default' : 'outline'} className="text-[10px]">
                    v{v.version}
                    {idx === 0 ? ' · current' : ''}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      Loan {money(v.result.totalLoan)} · {v.result.totalLVR.toFixed(2)}% LVR
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(v.createdAt).toLocaleString('en-AU')} ·{' '}
                      {v.inputs.lenderName ?? 'Market average'} · LMI{' '}
                      {money(v.result.lmi + v.result.lmiStampDuty)}
                      {prev && (loanDelta !== 0 || Math.abs(lvrDelta) > 0.004) && (
                        <>
                          {' · '}
                          <span className={loanDelta > 0 ? 'text-destructive' : 'text-success'}>
                            {loanDelta > 0 ? '+' : ''}
                            {money(loanDelta)} loan ({lvrDelta > 0 ? '+' : ''}
                            {lvrDelta.toFixed(2)}% LVR)
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  {onLoad && (
                    <Button variant="ghost" size="sm" onClick={() => onLoad(v)}>
                      <Upload className="mr-1 h-3.5 w-3.5" /> Load
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => exportPdf(v)}>
                    <Download className="mr-1 h-3.5 w-3.5" /> PDF
                  </Button>
                  {onRestore && idx > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy === v.id}
                      onClick={() => restore(v)}
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5" /> Roll back
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Delete version"
                      onClick={() => onDelete(v.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
