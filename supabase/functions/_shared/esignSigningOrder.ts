export function nextSigningGroup<T extends { status: string; signing_order: number; sent_at: string | null }>(signers: readonly T[], reminder = false): T[] {
  const outstanding = signers.filter(s => ["pending", "sent", "viewed"].includes(s.status));
  if (!outstanding.length) return [];
  const order = Math.min(...outstanding.map(s => s.signing_order));
  return outstanding.filter(s => s.signing_order === order && (reminder || !s.sent_at));
}