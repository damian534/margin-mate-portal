// Deal stage aging — "traffic light" logic based on business days in the current stage.

export type AgingLevel = 'green' | 'amber' | 'red';

export interface AgingThresholds {
  amber_after_days?: number | null;
  red_after_days?: number | null;
}

export const DEFAULT_AMBER_AFTER = 4; // business days
export const DEFAULT_RED_AFTER = 7; // business days

/** Count business days (Mon–Fri) between two dates. Same day = 0, next business day = 1, etc. */
export function businessDaysBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  let days = 0;
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days++;
  }
  return days;
}

export function getAgingLevel(
  stageEnteredAt: string | null | undefined,
  thresholds: AgingThresholds | undefined,
  now: Date = new Date(),
): { level: AgingLevel; businessDays: number } | null {
  if (!stageEnteredAt) return null;
  const entered = new Date(stageEnteredAt);
  if (isNaN(entered.getTime())) return null;
  const businessDays = businessDaysBetween(entered, now);
  const amberAfter = thresholds?.amber_after_days ?? DEFAULT_AMBER_AFTER;
  const redAfter = thresholds?.red_after_days ?? DEFAULT_RED_AFTER;
  const level: AgingLevel = businessDays >= redAfter ? 'red' : businessDays >= amberAfter ? 'amber' : 'green';
  return { level, businessDays };
}

/** Stages where aging is not meaningful (terminal stages). */
export const AGING_EXEMPT_STATUSES = new Set(['settled', 'lost']);

export const AGING_DOT_CLASS: Record<AgingLevel, string> = {
  green: 'bg-success',
  amber: 'bg-warning',
  red: 'bg-destructive',
};

/** Whole-card tint for kanban deal cards (replaces the default card surface). */
export const AGING_CARD_CLASS: Record<AgingLevel, string> = {
  green: 'bg-success/10 border-success/40',
  amber: 'bg-warning/15 border-warning/50',
  red: 'bg-destructive/10 border-destructive/50',
};

/** Row tint for table/list views. */
export const AGING_ROW_CLASS: Record<AgingLevel, string> = {
  green: 'bg-success/5',
  amber: 'bg-warning/10',
  red: 'bg-destructive/10',
};

/** Aging info for a card/row, respecting terminal-stage exemptions. */
export function getCardAging(
  stageEnteredAt: string | null | undefined,
  statusName: string,
  thresholds?: AgingThresholds,
): { level: AgingLevel; businessDays: number } | null {
  if (AGING_EXEMPT_STATUSES.has(statusName)) return null;
  return getAgingLevel(stageEnteredAt, thresholds);
}
