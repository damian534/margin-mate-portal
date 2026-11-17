export function nextSigningGroup<T extends { status: string; signing_order: number; sent_at: string | null }>(signers: readonly T[], reminder = false): T[] {
  const outstanding = signers.filter(s => ["pending", "sent", "viewed"].includes(s.status));
  return outstanding.filter(s => reminder || !s.sent_at);
}