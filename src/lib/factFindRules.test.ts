import { describe, expect, it } from 'vitest';
import { validConsent, validLegal } from '../../supabase/functions/_shared/factFindRules';
describe('standalone fact find consent', () => {
  it('requires both separate checkboxes and a typed full name', () => {
    expect(validConsent({ privacy: true, credit: true, typed_name: 'Michael Saweeris' })).toBe(true);
    expect(validConsent({ privacy: true, credit: false, typed_name: 'Michael Saweeris' })).toBe(false);
    expect(validConsent({ privacy: false, credit: true, typed_name: 'Michael Saweeris' })).toBe(false);
    expect(validConsent({ privacy: true, credit: true, typed_name: ' ' })).toBe(false);
  });
  it('blocks real consent without approved legal documents', () => {
    const legal = { approved: true, business_name: 'Margin Finance', privacy_url: 'https://example.com/privacy', credit_guide_url: 'https://example.com/credit', privacy_version: '1', privacy_summary: 'Approved summary' };
    expect(validLegal(legal)).toBe(true);
    expect(validLegal({ ...legal, approved: false })).toBe(false);
    expect(validLegal({ ...legal, credit_guide_url: '' })).toBe(false);
    expect(validLegal({ ...legal, privacy_url: 'javascript:alert(1)' })).toBe(false);
  });
});