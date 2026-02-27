// Australian Property Depreciation Calculator

export interface DepreciationInputs {
  buildYear: number;
  purchasePrice: number;
  constructionCostOverride?: number;
  currentYear?: number;
}

export interface DepreciationResult {
  estimatedConstructionCost: number;
  capitalWorksDepreciation: number;
  plantEquipmentDepreciation: number;
  totalAnnualDepreciation: number;
  remainingCapitalWorksYears: number;
  isEligibleForCapitalWorks: boolean;
  buildAge: number;
}

const CAPITAL_WORKS_RATE = 0.025;
const CAPITAL_WORKS_LIFE = 40;
const CAPITAL_WORKS_ELIGIBLE_FROM = 1985;
const PLANT_EQUIPMENT_NEW_ESTIMATE = 4000;
const PLANT_EQUIPMENT_DECLINE_YEARS = 12;
const CONSTRUCTION_COST_RATIO = 0.45;

export function estimateConstructionCost(purchasePrice: number): number {
  return Math.round(purchasePrice * CONSTRUCTION_COST_RATIO);
}

export function calculateCapitalWorksDepreciation(
  constructionCost: number, buildYear: number, currentYear: number = new Date().getFullYear()
): { annualAmount: number; remainingYears: number; isEligible: boolean } {
  const buildAge = currentYear - buildYear;
  if (buildYear < CAPITAL_WORKS_ELIGIBLE_FROM) return { annualAmount: 0, remainingYears: 0, isEligible: false };
  if (buildAge >= CAPITAL_WORKS_LIFE) return { annualAmount: 0, remainingYears: 0, isEligible: true };
  return { annualAmount: Math.round(constructionCost * CAPITAL_WORKS_RATE), remainingYears: CAPITAL_WORKS_LIFE - buildAge, isEligible: true };
}

export function calculatePlantEquipmentDepreciation(
  buildYear: number, purchasePrice: number, currentYear: number = new Date().getFullYear()
): number {
  const buildAge = currentYear - buildYear;
  const baseEstimate = PLANT_EQUIPMENT_NEW_ESTIMATE * (purchasePrice / 750000);
  if (buildAge >= PLANT_EQUIPMENT_DECLINE_YEARS) return Math.round(baseEstimate * 0.1);
  const declineFactor = 1 - (buildAge / PLANT_EQUIPMENT_DECLINE_YEARS) * 0.9;
  return Math.round(baseEstimate * declineFactor);
}

export function calculateDepreciation(inputs: DepreciationInputs): DepreciationResult {
  const currentYear = inputs.currentYear || new Date().getFullYear();
  const buildAge = currentYear - inputs.buildYear;
  const estimatedConstructionCost = inputs.constructionCostOverride || estimateConstructionCost(inputs.purchasePrice);
  const capitalWorks = calculateCapitalWorksDepreciation(estimatedConstructionCost, inputs.buildYear, currentYear);
  const plantEquipmentDepreciation = calculatePlantEquipmentDepreciation(inputs.buildYear, inputs.purchasePrice, currentYear);
  return {
    estimatedConstructionCost,
    capitalWorksDepreciation: capitalWorks.annualAmount,
    plantEquipmentDepreciation,
    totalAnnualDepreciation: capitalWorks.annualAmount + plantEquipmentDepreciation,
    remainingCapitalWorksYears: capitalWorks.remainingYears,
    isEligibleForCapitalWorks: capitalWorks.isEligible,
    buildAge,
  };
}

export function getBuildYearOptions(): { value: number; label: string }[] {
  const currentYear = new Date().getFullYear();
  const options: { value: number; label: string }[] = [];
  for (let year = currentYear; year >= currentYear - 10; year--) {
    options.push({ value: year, label: year.toString() });
  }
  const decades = [2010, 2005, 2000, 1995, 1990, 1985, 1980, 1970, 1960];
  for (const year of decades) {
    if (year < currentYear - 10) {
      const decadeEnd = year + 9;
      options.push({ value: year + 5, label: `${year}s (${year}-${Math.min(decadeEnd, currentYear - 11)})` });
    }
  }
  return options;
}
