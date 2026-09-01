import { AGING_DOT_CLASS, AGING_EXEMPT_STATUSES, getAgingLevel, type AgingThresholds } from '@/lib/stageAging';

interface StageAgingDotProps {
  stageEnteredAt: string | null | undefined;
  statusName: string;
  thresholds?: AgingThresholds;
  /** Show the "3d" day count next to the dot (default true) */
  showDays?: boolean;
  className?: string;
}

/**
 * Traffic-light dot showing how long a deal has been sitting in its current stage.
 * Business days only; green < amber threshold < red threshold (per stage, configurable).
 */
export function StageAgingDot({ stageEnteredAt, statusName, thresholds, showDays = true, className = '' }: StageAgingDotProps) {
  if (AGING_EXEMPT_STATUSES.has(statusName)) return null;
  const aging = getAgingLevel(stageEnteredAt, thresholds);
  if (!aging) return null;

  const label = `${aging.businessDays} business day${aging.businessDays === 1 ? '' : 's'} in this stage`;
  return (
    <span
      className={`inline-flex items-center gap-1 shrink-0 ${className}`}
      title={label}
      onClick={(e) => e.stopPropagation()}
    >
      <span className={`w-2 h-2 rounded-full ${AGING_DOT_CLASS[aging.level]} ${aging.level === 'red' ? 'animate-pulse' : ''}`} />
      {showDays && (
        <span className={`text-[10px] font-medium tabular-nums ${
          aging.level === 'red' ? 'text-destructive' : aging.level === 'amber' ? 'text-warning' : 'text-muted-foreground'
        }`}>
          {aging.businessDays}d
        </span>
      )}
    </span>
  );
}
