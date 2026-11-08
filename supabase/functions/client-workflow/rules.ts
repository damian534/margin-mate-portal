export type WorkflowStep = { channel: 'email' | 'sms'; subject: string; message: string };
export function renderWorkflowText(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*(first_name|last_name|broker_name)\s*\}\}/g, (_, key: string) => values[key] ?? '');
}
export function clientSendBlock(channel: 'email' | 'sms', consent: boolean, optedOut: boolean, hasRecipient: boolean): string | null {
  if (!hasRecipient) return `Missing client ${channel === 'email' ? 'email address' : 'mobile number'}`;
  if (optedOut) return 'Client opted out';
  if (!consent) return `No recorded ${channel.toUpperCase()} follow-up consent`;
  return null;
}