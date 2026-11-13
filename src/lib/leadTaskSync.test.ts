import { describe, expect, it } from 'vitest';
import { replaceLeadTasks } from './leadTaskSync';
import { hasOverdueTask } from './dealTaskUrgency';

describe('live deal task snapshots', () => {
  const michael = { id: 'task-michael', lead_id: 'michael', due_date: '2026-11-13', completed: false };
  const other = { id: 'other-task', lead_id: 'other', due_date: '2026-11-12', completed: false };

  it('removes Michael from overdue when his task moves to Monday without dropping other deals', () => {
    const now = new Date(2026, 10, 14, 9, 50);
    expect(hasOverdueTask([michael], now)).toBe(true);
    const next = replaceLeadTasks([michael, other], 'michael', [{ ...michael, due_date: '2026-11-16' }]);
    expect(next.find(task => task.id === michael.id)?.due_date).toBe('2026-11-16');
    expect(hasOverdueTask(next.filter(task => task.lead_id === 'michael'), now)).toBe(false);
    expect(next.find(task => task.id === other.id)).toEqual(other);
  });

  it('reflects completion and deletion in the dashboard snapshot', () => {
    const next = replaceLeadTasks([michael, other], 'michael', [{ ...michael, completed: true }]);
    expect(hasOverdueTask(next.filter(task => task.lead_id === 'michael'), new Date(2026, 10, 14))).toBe(false);
    expect(replaceLeadTasks(next, 'michael', [])).toEqual([other]);
  });
});