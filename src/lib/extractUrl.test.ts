import { describe, it, expect } from 'vitest';
import { extractFirstUrl } from './extractUrl';

describe('extractFirstUrl', () => {
  it('returns null for empty / nullish input', () => {
    expect(extractFirstUrl(null)).toBeNull();
    expect(extractFirstUrl(undefined)).toBeNull();
    expect(extractFirstUrl('')).toBeNull();
    expect(extractFirstUrl('no link here')).toBeNull();
  });

  it('extracts bankstatements.com.au share links', () => {
    expect(extractFirstUrl('https://scv.bankstatements.com.au/YBAY-DAME'))
      .toBe('https://scv.bankstatements.com.au/YBAY-DAME');
    expect(extractFirstUrl('Use https://bankstatements.com.au to upload'))
      .toBe('https://bankstatements.com.au');
  });

  it('handles bare domains without protocol', () => {
    expect(extractFirstUrl('bankstatements.com.au')).toBe('https://bankstatements.com.au');
    expect(extractFirstUrl('www.example.com/path')).toBe('https://www.example.com/path');
  });

  it('strips trailing punctuation', () => {
    expect(extractFirstUrl('Visit https://example.com.'))
      .toBe('https://example.com');
    expect(extractFirstUrl('Go to https://example.com/path,'))
      .toBe('https://example.com/path');
  });

  it('returns the first URL when multiple are present', () => {
    expect(extractFirstUrl('First https://a.com then https://b.com'))
      .toBe('https://a.com');
  });
});