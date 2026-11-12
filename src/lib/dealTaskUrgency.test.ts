import { describe, expect, it } from 'vitest';
import { hasOverdueTask } from './dealTaskUrgency';

const now = new Date(2026, 10, 12, 16, 22);
describe('deal overdue task highlighting', () => {
  it('flags an incomplete task due yesterday', () => {
    expect(hasOverdueTask([{ completed: false, due_date: '2026-11-11' }], now)).toBe(true);
  });
  it('does not flag tasks due today or in the future', () => {
    expect(hasOverdueTask([{ completed: false, due_date: '2026-11-12' }, { completed: false, due_date: '2026-11-13' }], now)).toBe(false);
  });
  it('does not flag completed overdue tasks', () => {
    expect(hasOverdueTask([{ completed: true, due_date: '2026-11-01' }], now)).toBe(false);
  });
  it('does not flag absent or invalid due dates', () => {
    expect(hasOverdueTask(undefined, now)).toBe(false);
    expect(hasOverdueTask([{ completed: false, due_date: null }, { completed: false, due_date: 'invalid' }], now)).toBe(false);
  });
  it('flags any overdue task even alongside completed and future tasks', () => {
    expect(hasOverdueTask([{ completed: true, due_date: '2026-11-01' }, { completed: false, due_date: '2026-11-13' }, { completed: false, due_date: '2026-11-11' }], now)).toBe(true);
  });
});