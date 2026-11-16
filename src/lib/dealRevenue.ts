export function calculateDealRevenue(loanAmount: number | null | undefined, mandateFee = 0) {
  const loan = Number.isFinite(loanAmount) ? Math.max(0, loanAmount ?? 0) : 0;
  const mandate = Number.isFinite(mandateFee) ? Math.max(0, mandateFee) : 0;
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  const upfront = round(loan * 0.0065);
  const trail = round(loan * 0.0015 * 2);
  return { upfront, trail, mandate, total: round(upfront + trail + mandate) };
}

// Empty split lists must not erase an explicitly entered loan estimate.
export function loanTotalOnLoad(amounts: (number | null)[]): number | undefined {
  return amounts.length ? amounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0) : undefined;
}