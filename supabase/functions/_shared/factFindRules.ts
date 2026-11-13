export const privacyDraft = 'We collect your details to understand your finances and assess suitable loan options. We may share information with lenders, credit reporting bodies and service providers involved in your application. Our Privacy Policy explains how to access or correct your information and make a complaint. Our Credit Guide explains our credit services.';
export function validLegal(settings: { approved?: boolean; business_name?: string; privacy_url?: string; credit_guide_url?: string; privacy_version?: string; privacy_summary?: string } | null) {
  return !!settings?.approved && !!settings.business_name?.trim() && !!settings.privacy_version?.trim() && !!settings.privacy_summary?.trim() && [settings.privacy_url, settings.credit_guide_url].every(url => {
    try { return new URL(url ?? '').protocol === 'https:'; } catch { return false; }
  });
}
export function validConsent(answers: { privacy?: boolean; credit?: boolean; typed_name?: string }) {
  return answers.privacy === true && answers.credit === true && (answers.typed_name?.trim().length ?? 0) >= 2;
}
export function creditText(business: string) {
  return `I consent to ${business} obtaining my credit report from a credit reporting body for the purpose of assessing my loan application.`;
}