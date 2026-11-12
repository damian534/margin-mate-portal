import { describe, expect, it } from 'vitest';
import { buildApplicantSigners } from './esignApplicants';

describe('saved applicants for e-sign', () => {
  it('includes Darren and co-applicant Sarah with their saved email addresses', () => {
    expect(buildApplicantSigners(
      { name: 'Darren Radcliffe', email: 'darren@example.com' },
      [{ name: 'Sarah Warren', email: 'sarah@example.com' }],
    )).toEqual([
      { name: 'Darren Radcliffe', email: 'darren@example.com' },
      { name: 'Sarah Warren', email: 'sarah@example.com' },
    ]);
  });
  it('does not repeat the primary applicant and fills a missing primary email', () => {
    expect(buildApplicantSigners({ name: 'Darren Radcliffe' }, [
      { name: ' Darren Radcliffe ', email: 'darren@example.com' },
      { name: 'Sarah Warren', email: 'sarah@example.com' },
    ])).toEqual([
      { name: 'Darren Radcliffe', email: 'darren@example.com' },
      { name: 'Sarah Warren', email: 'sarah@example.com' },
    ]);
  });
  it('keeps co-applicants with missing or shared emails', () => {
    expect(buildApplicantSigners({ name: 'Darren Radcliffe', email: 'shared@example.com' }, [
      { name: 'Sarah Warren', email: 'shared@example.com' },
      { name: 'Another applicant', email: null },
    ])).toHaveLength(3);
  });
  it('preserves the primary-only and empty form fallbacks', () => {
    expect(buildApplicantSigners({ name: 'Darren Radcliffe' }, [])).toEqual([{ name: 'Darren Radcliffe', email: '' }]);
    expect(buildApplicantSigners(undefined, [])).toEqual([{ name: '', email: '' }]);
  });
});