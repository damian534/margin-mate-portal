// Strict-but-friendly email validation.
// Requires: localpart@domain.tld where tld is at least 2 letters.
// Used to prevent saving partial emails like "name@outlook" (missing .com).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

export function isValidEmail(value: string | null | undefined): boolean {
  if (!value) return false;
  return EMAIL_RE.test(value.trim());
}

export function isEmptyOrValidEmail(value: string | null | undefined): boolean {
  if (!value || !value.trim()) return true;
  return isValidEmail(value);
}