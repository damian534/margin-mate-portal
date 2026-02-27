// Australian Tax Rate Calculations (2024-25 Financial Year)

const TAX_BRACKETS = [
  { min: 0, max: 18200, rate: 0, base: 0 },
  { min: 18201, max: 45000, rate: 16, base: 0 },
  { min: 45001, max: 135000, rate: 30, base: 4288 },
  { min: 135001, max: 190000, rate: 37, base: 31288 },
  { min: 190001, max: Infinity, rate: 45, base: 51638 },
];

export function calculateMarginalTaxRate(annualIncome: number): number {
  for (const bracket of TAX_BRACKETS) {
    if (annualIncome >= bracket.min && annualIncome <= bracket.max) {
      return bracket.rate;
    }
  }
  return 45;
}

export function calculateTaxPayable(annualIncome: number): number {
  if (annualIncome <= 18200) return 0;
  for (let i = TAX_BRACKETS.length - 1; i >= 0; i--) {
    const bracket = TAX_BRACKETS[i];
    if (annualIncome >= bracket.min) {
      const taxableInBracket = annualIncome - bracket.min + 1;
      return bracket.base + (taxableInBracket * bracket.rate / 100);
    }
  }
  return 0;
}
