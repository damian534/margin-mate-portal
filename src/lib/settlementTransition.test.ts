import { describe, expect, it } from 'vitest';
import { settlementTransition } from './settlementTransition';

describe('one settlement lifecycle per deal', () => {
  it('records the actual date when marking status settled', () => {
    expect(settlementTransition('status', 'settled', null, '2026-10-07'))
      .toEqual({ status: 'settled', settled_date: '2026-10-07' });
  });
  it('keeps Alex’s original date when WIP is also marked settled later', () => {
    expect(settlementTransition('wip_status', 'settled', '2026-10-07', '2026-10-13'))
      .toEqual({ wip_status: 'settled', settled_date: '2026-10-07' });
  });
  it('does not clear settlement history on other stage changes', () => {
    expect(settlementTransition('status', 'approved', '2026-10-07'))
      .toEqual({ status: 'approved' });
  });
});