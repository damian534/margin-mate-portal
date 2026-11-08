import { describe, expect, it } from 'vitest';
import { canManageMeta, parseMetaLead, verifyMetaSignature } from '../../supabase/functions/_shared/metaLeadRules';

describe('direct Facebook lead intake', () => {
  it('keeps varying questions and all selected answers', () => {
    const lead = parseMetaLead({ field_data: [{ name: 'full_name', values: ['Damian Medici'] }, { name: 'current_lender', values: ['Bank A'] }, { name: 'goals', values: ['Refinance', 'Invest'] }], campaign_name: 'Refinance', form_id: '123' });
    expect(lead.firstName).toBe('Damian');
    expect(lead.lastName).toBe('Medici');
    expect(lead.customFields.form_answers).toEqual([{ question: 'current lender', answer: 'Bank A' }, { question: 'goals', answer: 'Refinance, Invest' }]);
    expect(lead.customFields.ad_attribution).toEqual({ campaign: 'Refinance', form_id: '123' });
  });
  it('does not let a broker manage another brokerage or let staff change routing', () => {
    expect(canManageMeta('a', 'b', ['broker'])).toBe(false);
    expect(canManageMeta('a', 'a', ['broker_staff'])).toBe(false);
    expect(canManageMeta('a', 'a', ['broker'])).toBe(true);
  });
  it('rejects missing and modified delivery signatures', async () => {
    const secret = 'test-only-signature-key';
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const hash = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('{"object":"page"}')));
    const signature = 'sha256=' + Array.from(hash, b => b.toString(16).padStart(2, '0')).join('');
    expect(await verifyMetaSignature('{"object":"page"}', signature, secret)).toBe(true);
    expect(await verifyMetaSignature('{}', signature, secret)).toBe(false);
    expect(await verifyMetaSignature('{}', null, secret)).toBe(false);
  });
});