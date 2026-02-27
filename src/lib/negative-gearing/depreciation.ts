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

export function calculateDepreciation(inputs: DepreciationInputs): DepreciationResult {
  const currentYear = inputs.currentYear || new Date().getFullYear();
  const buildAge = currentYear - inputs.buildYear;
  const estimatedCost = inputs.constructionCostOverride ?? estimateConstructionCost(inputs.purchasePrice);

  let capitalWorksDepreciation = 0;
  let remainingCapitalWorksYears = 0;
  let isEligibleForCapitalWorks = inputs.buildYear >= CAPITAL_WORKS_ELIGIBLE_FROM;

  if (isEligibleForCapitalWorks && buildAge < CAPITAL_WORKS_LIFE) {
    remainingCapitalWorksYears = CAPITAL_WORKS_LIFE - buildAge;
    capitalWorksDepreciation = Math.round(estimatedCost * CAPITAL_WORKS_RATE);
  }

  const baseEstimate = PLANT_EQUIPMENT_NEW_ESTIMATE * (inputs.purchasePrice / 750000);
  let plantEquipmentDepreciation: number;
  if (buildAge >= PLANT_EQUIPMENT_DECLINE_YEARS) {
    plantEquipmentDepreciation = Math.round(baseEstimate * 0.1);
  } else {
    const declineFactor = 1 - (buildAge / PLANT_EQUIPMENT_DECLINE_YEARS) * 0.9;
    plantEquipmentDepreciation = Math.round(baseEstimate * declineFactor);
  }

  return {
    estimatedConstructionCost: estimatedCost,
    capitalWorksDepreciation,
    plantEquipmentDepreciation,
    totalAnnualDepreciation: capitalWorksDepreciation + plantEquipmentDepreciation,
    remainingCapitalWorksYears,
    isEligibleForCapitalWorks,
    buildAge,
  };
}

export function getDepreciationDescription(buildYear: number): string {
  const buildAge = new Date().getFullYear() - buildYear;
  if (buildYear < 1985) return "Properties built before September 1985 are not eligible for Division 43 Capital Works deductions.";
  if (buildAge >= 40) return "This property has reached its 40-year depreciation limit for Division 43.";
  return `${40 - buildAge} years of Capital Works depreciation remaining (2.5% p.a.).`;
}
