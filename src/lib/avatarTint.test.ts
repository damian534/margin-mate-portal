import { describe, it, expect } from 'vitest';
import { avatarTint } from './avatarTint';

describe('avatarTint', () => {
  it('is deterministic for the same name', () => {
    expect(avatarTint('Darren Ratcliffe')).toBe(avatarTint('Darren Ratcliffe'));
  });

  it('always returns one of the soft token tints', () => {
    for (const name of ['Ali Farhat', 'Peter Bellman', 'Kesha Atkins', '', 'X']) {
      expect(avatarTint(name)).toMatch(/^bg-(primary|info|success|warning|accent)\//);
    }
  });

  it('varies across different names', () => {
    const tints = new Set(
      ['Ali Farhat', 'Peter Bellman', 'Kesha Atkins', 'Melissa Day', 'Julian Goh', 'Pooja Shrestha'].map(avatarTint),
    );
    expect(tints.size).toBeGreaterThan(1);
  });
});
