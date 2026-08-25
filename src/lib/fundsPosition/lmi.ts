import type { StateKey } from '@/lib/stampDutyRates';

/**
 * Indicative Lenders Mortgage Insurance premium estimate.
 * Rates are a market-average full-doc owner occupied table expressed as a
 * percentage of the base loan amount, banded by LVR, with a loan-size loading.
 * Always confirm the exact premium with the lender's own quote.
 */
const LVR_BANDS: Array<{ maxLvr: number; rate: number }> = [
  { maxLvr: 80, rate: 0 },
  { maxLvr: 81, rate: 0.475 },
  { maxLvr: 82, rate: 0.568 },
  { maxLvr: 83, rate: 0.696 },
  { maxLvr: 84, rate: 0.809 },
  { maxLvr: 85, rate: 0.936 },
  { maxLvr: 86, rate: 1.106 },
  { maxLvr: 87, rate: 1.294 },
  { maxLvr: 88, rate: 1.464 },
  { maxLvr: 89, rate: 1.828 },
  { maxLvr: 90, rate: 2.148 },
  { maxLvr: 91, rate: 2.568 },
  { maxLvr: 92, rate: 2.79 },
  { maxLvr: 93, rate: 3.129 },
  { maxLvr: 94, rate: 3.269 },
  { maxLvr: 95, rate: 3.379 },
];

function sizeLoading(loan: number): number {
  if (loan > 1_000_000) return 1.4;
  if (loan > 750_000) return 1.25;
  if (loan > 500_000) return 1.1;
  return 1;
}

/** Stamp duty charged on the LMI premium, by state (approximate). */
const LMI_DUTY_RATE: Record<StateKey, number> = {
  VIC: 0.1,
  NSW: 0.095,
  QLD: 0.09,
  SA: 0.11,
  WA: 0.1,
  TAS: 0.1,
  ACT: 0.06,
  NT: 0.1,
};

export function estimateLmi(baseLoan: number, lvr: number, investment = false): number {
  if (!isFinite(lvr) || lvr <= 80 || baseLoan <= 0) return 0;
  if (lvr > 95) return 0; // outside standard LMI appetite
  const band = LVR_BANDS.find(b => lvr <= b.maxLvr) ?? LVR_BANDS[LVR_BANDS.length - 1];
  const investLoading = investment ? 1.1 : 1;
  return baseLoan * (band.rate / 100) * sizeLoading(baseLoan) * investLoading;
}

export function lmiStampDuty(premium: number, state: StateKey): number {
  return premium * (LMI_DUTY_RATE[state] ?? 0.1);
}
