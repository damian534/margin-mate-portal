// ─────────────────────────────────────────────────────────────
// Central Australian tax rules configuration.
// Update this file when legislation changes — the engine reads
// everything from here, nothing is hardcoded downstream.
// ─────────────────────────────────────────────────────────────

export const TAX_RULES_VERSION = "Australian Tax Rules – FY2026–27 / Post Reform";

export interface TaxBracket {
  /** Income threshold at which this bracket starts (inclusive) */
  from: number;
  /** Income threshold at which this bracket ends (inclusive) */
  to: number;
  /** Marginal rate as a decimal */
  rate: number;
}

export const taxRules = {
  version: TAX_RULES_VERSION,

  /** Contracts entered before this moment keep the existing negative gearing rules */
  grandfatheringCutoffDate: new Date("2026-05-12T19:30:00+10:00"),
  /** Negative gearing restrictions for established property begin */
  negativeGearingReformStartDate: new Date("2027-07-01T00:00:00+10:00"),
  /** CGT indexation regime applies to gains accruing from this date */
  cgtIndexationStartDate: new Date("2027-07-01T00:00:00+10:00"),

  /** Minimum tax rate applied to real (indexed) capital gains under the new regime */
  minimumCGTRate: 0.3,

  /** Standard CGT discount for pre-reform gains / grandfathered assets */
  cgtDiscountRate: 0.5,
  cgtDiscountMinimumMonths: 12,

  medicareLevyRate: 0.02,
  medicareLevyThreshold: 27222,
  medicareLevyShadeOutTop: 34027,

  personalIncomeTaxBrackets: [
    { from: 0, to: 18200, rate: 0 },
    { from: 18200, to: 45000, rate: 0.16 },
    { from: 45000, to: 135000, rate: 0.3 },
    { from: 135000, to: 190000, rate: 0.37 },
    { from: 190000, to: Infinity, rate: 0.45 },
  ] as TaxBracket[],

  /** Division 43 capital works: rate and effective life */
  capitalWorksRate: 0.025,
  capitalWorksLifeYears: 40,
};

/** Progressive income tax (excluding Medicare levy). Full precision, never rounded. */
export function incomeTax(taxableIncome: number): number {
  const income = Math.max(0, taxableIncome);
  let tax = 0;
  for (const b of taxRules.personalIncomeTaxBrackets) {
    if (income <= b.from) break;
    const slice = Math.min(income, b.to) - b.from;
    tax += slice * b.rate;
  }
  return tax;
}

/** Medicare levy with a simplified shade-in across the low income threshold. */
export function medicareLevy(taxableIncome: number): number {
  const income = Math.max(0, taxableIncome);
  if (income <= taxRules.medicareLevyThreshold) return 0;
  if (income <= taxRules.medicareLevyShadeOutTop) {
    return (income - taxRules.medicareLevyThreshold) * 0.1;
  }
  return income * taxRules.medicareLevyRate;
}

/** Total personal tax payable, optionally including the Medicare levy. */
export function totalTax(taxableIncome: number, includeMedicare: boolean): number {
  return incomeTax(taxableIncome) + (includeMedicare ? medicareLevy(taxableIncome) : 0);
}

/**
 * The true tax impact of adding (or deducting) an amount of income.
 * Positive delta => extra tax payable. Negative delta => tax saving.
 * This is "tax with property" vs "tax without property", not amount × marginal rate.
 */
export function taxDelta(baseIncome: number, adjustment: number, includeMedicare: boolean): number {
  return totalTax(baseIncome + adjustment, includeMedicare) - totalTax(baseIncome, includeMedicare);
}

/** Marginal rate applying at a given income (for display only). */
export function marginalRate(taxableIncome: number, includeMedicare: boolean): number {
  const bracket = taxRules.personalIncomeTaxBrackets.find(
    (b) => taxableIncome > b.from && taxableIncome <= b.to,
  ) ?? taxRules.personalIncomeTaxBrackets[taxRules.personalIncomeTaxBrackets.length - 1];
  const medicare = includeMedicare && taxableIncome > taxRules.medicareLevyShadeOutTop ? taxRules.medicareLevyRate : 0;
  return bracket.rate + medicare;
}

export type PropertyTaxCategory = "established" | "new-build" | "grandfathered";

/** Is the contract date before the grandfathering cutoff? */
export function isGrandfatheredByDate(purchaseDate: Date): boolean {
  return purchaseDate.getTime() < taxRules.grandfatheringCutoffDate.getTime();
}

/**
 * Can a residential property loss be offset against other income in the
 * financial year ending on `yearEndDate`?
 */
export function negativeGearingAllowed(category: PropertyTaxCategory, yearEndDate: Date): boolean {
  if (category === "grandfathered" || category === "new-build") return true;
  return yearEndDate.getTime() < taxRules.negativeGearingReformStartDate.getTime();
}
