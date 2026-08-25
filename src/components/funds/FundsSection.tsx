import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  subtitle?: string;
  summary?: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/** A collapsible, clearly-delineated section of the funding position. */
export function FundsSection({
  title,
  subtitle,
  summary,
  icon,
  defaultOpen = true,
  children,
  className,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn('rounded-xl border bg-card overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        {icon && <span className="text-primary shrink-0">{icon}</span>}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          {subtitle && <span className="block text-[11px] text-muted-foreground">{subtitle}</span>}
        </span>
        {summary && (
          <span className="text-sm font-semibold tabular-nums whitespace-nowrap">{summary}</span>
        )}
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div className="border-t px-4 py-4">{children}</div>}
    </section>
  );
}
