import { isBefore, isValid, parseISO, startOfDay } from 'date-fns';

interface DatedTask {
  completed: boolean;
  due_date: string | null;
}

/** Date-only deadlines become overdue the following day, not during their due day. */
export function hasOverdueTask(tasks: readonly DatedTask[] | undefined, now = new Date()): boolean {
  const today = startOfDay(now);
  return tasks?.some(task => {
    if (task.completed || !task.due_date) return false;
    const due = parseISO(task.due_date);
    return isValid(due) && isBefore(startOfDay(due), today);
  }) ?? false;
}