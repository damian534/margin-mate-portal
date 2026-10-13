import { format } from 'date-fns';

/** Write lifecycle changes to the deal; only the database creates its settlement. */
export function settlementTransition(
  field: 'status' | 'wip_status',
  value: string | null,
  settledDate?: string | null,
  today = format(new Date(), 'yyyy-MM-dd'),
) {
  return {
    [field]: value,
    ...(value === 'settled' ? { settled_date: settledDate || today } : {}),
  };
}