import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SectionTone = 'neutral' | 'ok' | 'soon' | 'urgent' | 'past' | 'success' | 'info';

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  tone?: SectionTone;
  /** Optional control rendered on the right of the header (before the collapse toggle) */
  rightSlot?: ReactNode;
  /** Whether to show the collapse/expand toggle */
  collapsible?: boolean;
  /** Default to collapsed */
  defaultCollapsed?: boolean;
  /** Controlled collapsed state */
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
  className?: string;
  children?: ReactNode;
}

/** Unified collapsible card matching the Pre-Approval / Subject-to-Finance look. */
export function SectionCard({
  icon: Icon, title, subtitle, tone = 'neutral', rightSlot,
  collapsible = true, defaultCollapsed = false, collapsed: controlled, onToggle,
  className, children,
}: Props) {
  const [internal, setInternal] = useState(defaultCollapsed);
  const collapsed = controlled ?? internal;
  const toggle = () => {
    const next = !collapsed;
    if (controlled === undefined) setInternal(next);
    onToggle?.(next);
  };

  const cardClasses = cn(
    'rounded-xl border-2 shadow-md overflow-hidden mb-3',
    tone === 'past' && 'border-destructive/40 bg-gradient-to-br from-destructive/10 via-background to-background',
    tone === 'urgent' && 'border-destructive/40 bg-gradient-to-br from-destructive/10 via-background to-background',
    tone === 'soon' && 'border-amber-400/50 bg-gradient-to-br from-amber-100/50 via-background to-background',
    tone === 'ok' && 'border-success/30 bg-gradient-to-br from-success/10 via-background to-background',
    tone === 'success' && 'border-success/40 bg-gradient-to-br from-success/15 via-background to-background',
    tone === 'info' && 'border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background',
    tone === 'neutral' && 'border-border bg-muted/20',
    className,
  );

  const headerClasses = cn(
    'flex items-center justify-between px-4 py-3',
    !collapsed && 'border-b',
    tone === 'past' || tone === 'urgent' ? 'bg-destructive/10 border-destructive/20' :
    tone === 'soon' ? 'bg-amber-100/60 border-amber-300/40' :
    tone === 'ok' || tone === 'success' ? 'bg-success/10 border-success/20' :
    tone === 'info' ? 'bg-primary/10 border-primary/20' :
    'bg-muted/40 border-border',
  );

  const iconBg = cn(
    'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
    tone === 'past' || tone === 'urgent' ? 'bg-destructive text-destructive-foreground' :
    tone === 'soon' ? 'bg-amber-500 text-white' :
    tone === 'ok' || tone === 'success' ? 'bg-success text-success-foreground' :
    tone === 'info' ? 'bg-primary text-primary-foreground' :
    'bg-muted text-muted-foreground',
  );

  return (
    <div className={cardClasses}>
      <div className={headerClasses}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={iconBg}><Icon className="w-4 h-4" /></div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground leading-tight">{title}</h3>
            {subtitle && <p className="text-[11px] text-muted-foreground leading-tight">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rightSlot}
          {collapsible && (
            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={toggle}>
              {collapsed ? <><ChevronDown className="w-4 h-4" /> Expand</> : <><ChevronUp className="w-4 h-4" /> Collapse</>}
            </Button>
          )}
        </div>
      </div>
      {!collapsed && children && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}
