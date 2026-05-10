import { ReactNode, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtCurrency } from '@/lib/factFindAggregates';

interface Props {
  label: string;
  total?: number | null;
  /** Pass null to hide the Add button entirely */
  onAdd?: (() => void) | null;
  addLabel?: string;
  defaultOpen?: boolean;
  children?: ReactNode;
  /** Show a small subtitle line under the total (e.g. "monthly") */
  totalSuffix?: string;
}

/** Collapsible group card matching the Financials screenshot. */
export function FinancialGroupCard({
  label,
  total,
  onAdd,
  addLabel = 'Add',
  defaultOpen = false,
  children,
  totalSuffix,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg bg-muted/40 border border-border/60 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-7 h-7 rounded-md border border-border bg-background flex items-center justify-center shrink-0 hover:bg-muted transition"
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          <ChevronDown className={cn('w-4 h-4 transition-transform', open ? 'rotate-0' : '-rotate-90')} />
        </button>
        <span className="text-sm sm:text-base font-semibold text-primary truncate">{label}</span>
        {typeof total === 'number' && (
          <span className="ml-auto flex items-baseline gap-1.5 text-sm tabular-nums">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Total</span>
            <span className="font-semibold text-foreground">{fmtCurrency(total)}</span>
            {totalSuffix && <span className="text-xs text-muted-foreground">{totalSuffix}</span>}
          </span>
        )}
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="hidden sm:inline-flex items-center gap-1.5 ml-3 px-3 py-1.5 rounded-md border-2 border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 transition"
          >
            <Plus className="w-3.5 h-3.5" /> {addLabel}
          </button>
        )}
      </div>
      {onAdd && (
        <div className="sm:hidden px-3 pb-3">
          <button
            type="button"
            onClick={onAdd}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border-2 border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 transition"
          >
            <Plus className="w-3.5 h-3.5" /> {addLabel}
          </button>
        </div>
      )}
      {open && children && (
        <div className="bg-background border-t border-border/60 px-3 py-3 sm:px-4 sm:py-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}
