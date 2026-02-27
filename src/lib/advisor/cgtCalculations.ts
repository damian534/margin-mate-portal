// Australian Capital Gains Tax (CGT) Calculations

export interface CGTInputs {
  purchasePrice: number;
  purchaseCosts: number;
  currentValue: number;
  sellingCosts: number;
  purchaseYear: number;
  saleYear: number;
  ownershipType: 'individual' | 'joint' | 'company' | 'trust';
  applicant1OwnershipPercent: number;
  applicant1TaxableIncome: number;
  applicant1MarginalRate: number;
  applicant2TaxableIncome?: number;
  applicant2MarginalRate?: number;
  wasMainResidence: boolean;
  mainResidenceStartDate?: Date;
  mainResidenceEndDate?: Date;
  usedFor6YearRule: boolean;
  sixYearRuleStartDate?: Date;
  capitalImprovements: number;
  preCGTProperty: boolean;
  wasEverRented: boolean;
  rentalStartDate?: Date;
  rentalEndDate?: Date;
}

export interface CGTResult {
  costBase: number;
  capitalGain: number;
  discountedGain: number;
  taxableGain: number;
  mainResidenceExemption: number;
  sixYearRuleApplies: boolean;
  sixYearExemptionAmount: number;
  isFullyExempt: boolean;
  applicant1CGTPayable: number;
  applicant2CGTPayable: number;
  totalCGTPayable: number;
  holdingPeriodYears: number;
  eligibleForDiscount: boolean;
  effectiveCGTRate: number;
  netProceedsAfterCGT: number;
}

const TAX_BRACKETS = [
  { min: 0, max: 18200, rate: 0, base: 0 },
  { min: 18201, max: 45000, rate: 16, base: 0 },
  { min: 45001, max: 135000, rate: 30, base: 4288 },
  { min: 135001, max: 190000, rate: 37, base: 31288 },
  { min: 190001, max: Infinity, rate: 45, base: 51638 },
];

function calculateTaxOnIncome(income: number): number {
  if (income <= 18200) return 0;
  for (let i = TAX_BRACKETS.length - 1; i >= 0; i--) {
    const bracket = TAX_BRACKETS[i];
    if (income >= bracket.min) {
      const taxableInBracket = income - bracket.min + 1;
      return bracket.base + (taxableInBracket * bracket.rate / 100);
    }
  }
  return 0;
}

function calculateCGTOnGain(taxableIncome: number, capitalGain: number, _marginalRate: number): number {
  const totalIncome = taxableIncome + capitalGain;
  return calculateTaxOnIncome(totalIncome) - calculateTaxOnIncome(taxableIncome);
}

export function calculateCGT(inputs: CGTInputs): CGTResult {
  if (inputs.preCGTProperty) {
    const costBase = inputs.purchasePrice + inputs.purchaseCosts + inputs.capitalImprovements;
    return {
      costBase, capitalGain: 0, discountedGain: 0, taxableGain: 0,
      mainResidenceExemption: inputs.currentValue - costBase,
      sixYearRuleApplies: false, sixYearExemptionAmount: 0, isFullyExempt: true,
      applicant1CGTPayable: 0, applicant2CGTPayable: 0, totalCGTPayable: 0,
      holdingPeriodYears: inputs.saleYear - inputs.purchaseYear,
      eligibleForDiscount: false, effectiveCGTRate: 0,
      netProceedsAfterCGT: inputs.currentValue - inputs.sellingCosts,
    };
  }

  const costBase = inputs.purchasePrice + inputs.purchaseCosts + inputs.capitalImprovements;
  const capitalProceeds = inputs.currentValue - inputs.sellingCosts;
  const rawCapitalGain = Math.max(0, capitalProceeds - costBase);
  const holdingPeriodYears = inputs.saleYear - inputs.purchaseYear;
  const holdingPeriodMonths = holdingPeriodYears * 12;
  const eligibleForDiscount = holdingPeriodMonths >= 12 && (inputs.ownershipType === 'individual' || inputs.ownershipType === 'joint');

  let mainResidenceExemption = 0;
  let sixYearExemptionAmount = 0;
  let sixYearRuleApplies = false;
  let isFullyExempt = false;

  if (inputs.wasMainResidence) {
    if (!inputs.wasEverRented) {
      mainResidenceExemption = rawCapitalGain;
      isFullyExempt = true;
    } else if (inputs.usedFor6YearRule && inputs.sixYearRuleStartDate) {
      const saleDate = new Date(inputs.saleYear, 11, 31);
      const absenceYears = (saleDate.getTime() - inputs.sixYearRuleStartDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (absenceYears <= 6) {
        sixYearRuleApplies = true;
        sixYearExemptionAmount = rawCapitalGain;
        isFullyExempt = true;
      } else {
        sixYearRuleApplies = true;
        const purchaseDate = new Date(inputs.purchaseYear, 0, 1);
        const totalOwnershipDays = (saleDate.getTime() - purchaseDate.getTime()) / (24 * 60 * 60 * 1000);
        const mainResidenceDays = (inputs.sixYearRuleStartDate.getTime() - purchaseDate.getTime()) / (24 * 60 * 60 * 1000);
        const exemptDays = mainResidenceDays + (6 * 365.25);
        sixYearExemptionAmount = rawCapitalGain * Math.min(1, exemptDays / totalOwnershipDays);
      }
    } else if (inputs.wasEverRented && inputs.rentalStartDate && inputs.rentalEndDate) {
      const purchaseDate = new Date(inputs.purchaseYear, 0, 1);
      const saleDate = new Date(inputs.saleYear, 11, 31);
      const totalOwnershipDays = (saleDate.getTime() - purchaseDate.getTime()) / (24 * 60 * 60 * 1000);
      const rentalDays = (inputs.rentalEndDate.getTime() - inputs.rentalStartDate.getTime()) / (24 * 60 * 60 * 1000);
      mainResidenceExemption = rawCapitalGain * ((totalOwnershipDays - rentalDays) / totalOwnershipDays);
    }
  }

  const totalExemption = mainResidenceExemption + sixYearExemptionAmount;
  const gainAfterExemptions = Math.max(0, rawCapitalGain - totalExemption);
  const discountedGain = eligibleForDiscount ? gainAfterExemptions * 0.5 : gainAfterExemptions;
  const applicant1Share = inputs.applicant1OwnershipPercent / 100;
  const applicant2Share = 1 - applicant1Share;
  const applicant1TaxableGain = discountedGain * applicant1Share;
  const applicant2TaxableGain = inputs.ownershipType === 'joint' ? discountedGain * applicant2Share : 0;

  const applicant1CGTPayable = calculateCGTOnGain(inputs.applicant1TaxableIncome, applicant1TaxableGain, inputs.applicant1MarginalRate);
  const applicant2CGTPayable = inputs.ownershipType === 'joint' && inputs.applicant2TaxableIncome
    ? calculateCGTOnGain(inputs.applicant2TaxableIncome, applicant2TaxableGain, inputs.applicant2MarginalRate || 0)
    : 0;
  const totalCGTPayable = applicant1CGTPayable + applicant2CGTPayable;
  const effectiveCGTRate = rawCapitalGain > 0 ? (totalCGTPayable / rawCapitalGain) * 100 : 0;

  return {
    costBase, capitalGain: rawCapitalGain, discountedGain, taxableGain: discountedGain,
    mainResidenceExemption, sixYearRuleApplies, sixYearExemptionAmount, isFullyExempt,
    applicant1CGTPayable, applicant2CGTPayable, totalCGTPayable,
    holdingPeriodYears, eligibleForDiscount, effectiveCGTRate,
    netProceedsAfterCGT: capitalProceeds - totalCGTPayable,
  };
}

export function getCGTExemptionStatus(result: CGTResult): string {
  if (result.isFullyExempt) {
    return result.sixYearRuleApplies ? "Fully exempt under 6-year absence rule" : "Fully exempt as main residence";
  }
  if (result.mainResidenceExemption > 0 || result.sixYearExemptionAmount > 0) return "Partially exempt (apportioned)";
  return "No exemption applies";
}
