import type { FundsPositionInputs, FundsPositionResult } from './types';

export type WarningLevel = 'error' | 'warning' | 'info';

export interface FundsWarning {
  id: string;
  level: WarningLevel;
  message: string;
}

/**
 * Smart validation for a funding position. Flags impossible combinations
 * (errors) and risky / lender-policy-breaching ones (warnings).
 */
export function validateFundsPosition(
  i: FundsPositionInputs,
  r: FundsPositionResult,
): FundsWarning[] {
  const w: FundsWarning[] = [];
  const push = (id: string, level: WarningLevel, message: string) => w.push({ id, level, message });

  const isPurchase = i.transactionType === 'purchase' || i.transactionType === 'property_only';

  // ── Structural / impossible combinations ────────────────────────────────
  if (!i.propertyValue.auto && i.propertyValue.value <= 0 && isPurchase) {
    push('pv-zero', 'error', 'Property value is zero — enter a purchase price or switch it to auto.');
  }
  if (!i.baseLoan.auto && !i.baseLVR.auto && !i.propertyValue.auto) {
    push('over-specified', 'warning', 'Property value, LVR and loan are all locked — the loan amount wins and LVR is recalculated.');
  }
  if (i.baseLoan.auto && i.baseLVR.auto && i.fundsAvailable.auto) {
    push('under-specified', 'error', 'Loan, LVR and funds available are all on auto — lock at least one so the position can be solved.');
  }
  if (r.baseLoan < 0 || r.propertyValue < 0) {
    push('negative', 'error', 'The solved position is negative — check the locked inputs.');
  }

  // ── LVR bounds ───────────────────────────────────────────────────────────
  if (r.baseLVR > 100) {
    push('lvr-over-100', 'error', `Base LVR of ${r.baseLVR.toFixed(2)}% exceeds the property value — no lender will fund above 100%.`);
  } else if (r.totalLVR > 98) {
    push('lvr-98', 'error', `Total LVR of ${r.totalLVR.toFixed(2)}% is above the 98% ceiling once LMI is capitalised.`);
  } else if (r.totalLVR > 95) {
    push('lvr-95', 'warning', `Total LVR of ${r.totalLVR.toFixed(2)}% is above 95% — only a handful of lenders allow LMI capitalisation past 95%.`);
  } else if (r.baseLVR > 90 && !i.fhgScheme) {
    push('lvr-90', 'info', `Base LVR of ${r.baseLVR.toFixed(2)}% attracts a materially higher LMI premium and tighter credit policy.`);
  }
  if (i.propertyType === 'vacant_no_build' && r.baseLVR > 80) {
    push('land-lvr', 'warning', 'Vacant land with no build plan is usually capped around 80% LVR.');
  }
  if (i.purpose === 'investment' && r.baseLVR > 90) {
    push('inv-lvr', 'warning', 'Investment lending above 90% LVR is outside most lender policies.');
  }

  // ── LMI capitalisation constraints ──────────────────────────────────────
  if (i.capitaliseLMI && r.lmi > 0 && r.totalLVR > 97) {
    push('lmi-cap', 'error', 'LMI cannot be capitalised here — the capitalised total LVR breaches the 97% policy cap.');
  }
  if (i.capitaliseLMI && r.lmi === 0) {
    push('lmi-none', 'info', 'Capitalise LMI is on but no LMI applies at this LVR.');
  }
  if (i.fhgScheme && r.baseLVR > 95) {
    push('fhg-lvr', 'warning', 'First Home Guarantee requires at least a 5% deposit — LVR above 95% is not eligible.');
  }
  if (i.fhgScheme && i.purpose === 'investment') {
    push('fhg-inv', 'error', 'First Home Guarantee is not available for investment purchases.');
  }
  if (!i.lmiOverride.auto && i.lmiOverride.value > 0 && r.baseLVR <= 80) {
    push('lmi-override', 'info', 'An LMI override is entered but the LVR is at or below 80% — LMI is not being applied.');
  }

  // ── Deposit / funds limits ──────────────────────────────────────────────
  if (r.netSurplus < 0) {
    push('shortfall', 'error', `Shortfall of $${Math.abs(Math.round(r.netSurplus)).toLocaleString('en-AU')} — the client needs more funds or a higher loan.`);
  }
  if (isPurchase && r.propertyValue > 0) {
    const genuineSavings = i.fundsDetailed ? i.savings + i.deposit : r.fundsAvailable;
    const depositPct = (r.propertyValue - r.baseLoan) / r.propertyValue * 100;
    if (depositPct < 5 && !i.fhgScheme) {
      push('deposit-5', 'warning', `Deposit is only ${Math.max(0, depositPct).toFixed(1)}% of the purchase price — most lenders require 5% minimum.`);
    }
    if (i.fundsDetailed && i.gifts > 0 && genuineSavings > 0 && i.gifts / (genuineSavings + i.gifts) > 0.5 && r.baseLVR > 85) {
      push('gift-heavy', 'warning', 'More than half the deposit is gifted — above 85% LVR most lenders want 5% genuine savings.');
    }
    if (i.fundsDetailed && i.equity > 0 && i.equity > r.fundsAvailable) {
      push('equity', 'info', 'Equity release makes up the whole contribution — confirm the security valuation supports it.');
    }
  }
  if (r.netSurplus > 0 && r.netSurplus > r.propertyValue * 0.1 && r.propertyValue > 0) {
    push('big-surplus', 'info', 'Large surplus — consider reducing the loan amount or LVR to cut LMI.');
  }

  // ── Loan terms ──────────────────────────────────────────────────────────
  if (i.rate <= 0) push('rate', 'warning', 'Interest rate is zero — repayments will not be meaningful.');
  if (i.termYears <= 0 || i.termYears > 40) push('term', 'warning', 'Loan term should be between 1 and 40 years.');
  if (i.ioYears > 5 && i.purpose === 'owner_occupied') {
    push('io-term', 'warning', 'Interest-only terms beyond 5 years are rarely approved for owner-occupied lending.');
  }
  if (i.ioYears > i.termYears) push('io-gt-term', 'error', 'Interest-only period is longer than the loan term.');

  return w;
}
