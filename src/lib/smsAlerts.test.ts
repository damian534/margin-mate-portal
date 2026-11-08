import { describe, expect, it } from 'vitest';
import { normalizeSmsPhone, newLeadSms } from '../../supabase/functions/new-lead-sms/rules';

describe('new-lead SMS alerts', () => {
  it('uses the broker mobile rather than the client phone', () => {
    expect(normalizeSmsPhone('0412 345 678')).toBe('+61412345678');
  });
  it('rejects a phone without a usable international format', () => {
    expect(normalizeSmsPhone('123')).toBeNull();
  });
  it('includes the received lead and its deal link', () => {
    const message = newLeadSms({ first_name: 'Alex', last_name: 'Dematos', id: 'abc' });
    expect(message).toContain('Alex Dematos');
    expect(message).toContain('/admin?lead=abc');
  });
});