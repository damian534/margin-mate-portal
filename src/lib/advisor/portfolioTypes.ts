// Portfolio Types for Multi-Property Advisor Toolkit
import { AustralianState } from "./stampDuty";

export type PropertyMode = 'already-held' | 'new-purchase';

export interface PropertyData {
  id: string;
  name: string;
  propertyMode: PropertyMode;
  purchasePrice: number;
  purchaseYear: number;
  state: AustralianState;
  additionalBuyingCosts: number;
  capitalImprovements: number;
  currentValue: number;
  landValue: number;
  originalLoanAmount: number;
  currentLoanBalance: number;
  loanType: 'interest-only' | 'principal-interest';
  interestRate: number;
  loanTerm: number;
  deposit: number;
  buildYear: number;
  constructionCostOverride?: number;
  isNewBuild: boolean;
  weeklyRent: number;
  propertyManagementFee: number;
  annualRatesInsurance: number;
  maintenanceAllowance: number;
  vacancyWeeks: number;
  monthlyOutOfPocketOverride?: number;
  wasMainResidence: boolean;
  useSixYearRule: boolean;
  movedOutYear: number;
  wasEverRented: boolean;
  rentalStartYear: number;
  sellingCostPercent: number;
  sellingCostOverride?: number;
  isBeingSold: boolean;
  isForeignOwner: boolean;
  annualGrowthRate: number;
  projectionPeriod: number;
}

export interface PropertyResults {
  holdingPeriodYears: number;
  totalGrowth: number;
  totalGrowthPercent: number;
  annualizedGrowth: number;
  stampDuty: number;
  entryCosts: number;
  totalOutOfPocket: number;
  estimatedTotalInterestPaid: number;
  totalHoldingCost: number;
  principalRepaid: number;
  grossYield: number;
  netYield: number;
  netRentalIncome: number;
  annualDepreciation: number;
  annualDeductions: number;
  annualTaxBenefit: number;
  cumulativeTaxBenefit: number;
  annualCashExpenses: number;
  afterTaxAnnualCashflow: number;
  afterTaxMonthlyShortfall: number;
  cumulativeAfterTaxShortfall: number;
  cgtPayable: number;
  netProceedsAfterCGT: number;
  isFullyExempt: boolean;
  netWealthAfterCGT: number;
  annualLandTax: number;
  sellingCosts: number;
  historicalAvgRate: number;
}

export interface FutureProjection {
  year: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  cumulativeShortfall: number;
  totalCashInvested: number;
  netWealthHolding: number;
  cgtIfSold: number;
  netProceedsIfSold: number;
  netWealthIfSold: number;
}

export interface HoldVsSellAnalysis {
  holdPropertyValue: number;
  holdEquity: number;
  holdCGT: number;
  holdNetProceeds: number;
  holdTotalShortfall: number;
  holdNetWealth: number;
  sellNetProceeds: number;
  reinvestmentGrowth: number;
  reinvestmentFinalValue: number;
  reinvestmentNetWealth: number;
  holdAdvantage: number;
  recommendation: 'hold' | 'sell' | 'neutral';
  reasoning: string;
}

export interface PortfolioSummary {
  totalProperties: number;
  totalCurrentValue: number;
  totalPurchasePrice: number;
  totalGrowth: number;
  totalCashInvested: number;
  totalCGTPayable: number;
  totalMonthlyShortfall: number;
  totalLoanBalance: number;
  totalEquity: number;
  totalNetWealthHolding: number;
  totalNetProceedsIfSold: number;
  totalNetWealthIfSold: number;
}

export function createDefaultProperty(id: string, index: number, mode: PropertyMode = 'already-held'): PropertyData {
  const currentYear = new Date().getFullYear();
  if (mode === 'new-purchase') {
    return {
      id, name: `New Property ${index + 1}`, propertyMode: 'new-purchase',
      purchasePrice: 750000, purchaseYear: currentYear, state: 'NSW',
      additionalBuyingCosts: 5000, capitalImprovements: 0, currentValue: 750000,
      landValue: 350000, originalLoanAmount: 600000, currentLoanBalance: 600000,
      loanType: 'interest-only', interestRate: 6.0, loanTerm: 30, deposit: 150000,
      buildYear: currentYear - 5, isNewBuild: false, constructionCostOverride: undefined,
      weeklyRent: 550, propertyManagementFee: 7.5, annualRatesInsurance: 4500,
      maintenanceAllowance: 2000, vacancyWeeks: 2, monthlyOutOfPocketOverride: undefined,
      wasMainResidence: false, useSixYearRule: false, movedOutYear: currentYear,
      wasEverRented: true, rentalStartYear: currentYear, sellingCostPercent: 2,
      sellingCostOverride: undefined, isBeingSold: false, isForeignOwner: false,
      annualGrowthRate: 6, projectionPeriod: 10,
    };
  }
  return {
    id, name: `Property ${index + 1}`, propertyMode: 'already-held',
    purchasePrice: 750000, purchaseYear: currentYear - 5, state: 'NSW',
    additionalBuyingCosts: 5000, capitalImprovements: 0, currentValue: 900000,
    landValue: 400000, originalLoanAmount: 520000, currentLoanBalance: 450000,
    loanType: 'principal-interest', interestRate: 6.0, loanTerm: 30, deposit: 0,
    buildYear: currentYear - 10, isNewBuild: false, constructionCostOverride: undefined,
    weeklyRent: 600, propertyManagementFee: 7.5, annualRatesInsurance: 5000,
    maintenanceAllowance: 2000, vacancyWeeks: 2, monthlyOutOfPocketOverride: undefined,
    wasMainResidence: false, useSixYearRule: false, movedOutYear: currentYear - 2,
    wasEverRented: true, rentalStartYear: currentYear - 5, sellingCostPercent: 2,
    sellingCostOverride: undefined, isBeingSold: false, isForeignOwner: false,
    annualGrowthRate: 6, projectionPeriod: 10,
  };
}

export function ensurePropertyDefaults(property: Partial<PropertyData>): PropertyData {
  const currentYear = new Date().getFullYear();
  const propertyMode = property.propertyMode ?? 'already-held';
  const legacySellingCosts = (property as any).sellingCosts;
  return {
    id: property.id || `prop_${Date.now()}`, name: property.name || 'Property', propertyMode,
    purchasePrice: property.purchasePrice ?? 750000,
    purchaseYear: property.purchaseYear ?? (propertyMode === 'new-purchase' ? currentYear : currentYear - 5),
    state: property.state ?? 'NSW', additionalBuyingCosts: property.additionalBuyingCosts ?? 5000,
    capitalImprovements: property.capitalImprovements ?? 0,
    currentValue: property.currentValue ?? 900000, landValue: property.landValue ?? 400000,
    originalLoanAmount: property.originalLoanAmount ?? 520000,
    currentLoanBalance: property.currentLoanBalance ?? 450000,
    loanType: property.loanType ?? (propertyMode === 'new-purchase' ? 'interest-only' : 'principal-interest'),
    interestRate: property.interestRate ?? 6.0, loanTerm: property.loanTerm ?? 30,
    deposit: property.deposit ?? 150000,
    buildYear: property.buildYear ?? currentYear - 10, isNewBuild: property.isNewBuild ?? false,
    constructionCostOverride: property.constructionCostOverride,
    weeklyRent: property.weeklyRent ?? 600, propertyManagementFee: property.propertyManagementFee ?? 7.5,
    annualRatesInsurance: property.annualRatesInsurance ?? 5000,
    maintenanceAllowance: property.maintenanceAllowance ?? 2000,
    vacancyWeeks: property.vacancyWeeks ?? 2,
    monthlyOutOfPocketOverride: property.monthlyOutOfPocketOverride,
    wasMainResidence: property.wasMainResidence ?? false,
    useSixYearRule: property.useSixYearRule ?? false,
    movedOutYear: property.movedOutYear ?? currentYear - 2,
    wasEverRented: property.wasEverRented ?? true,
    rentalStartYear: property.rentalStartYear ?? currentYear - 5,
    sellingCostPercent: property.sellingCostPercent ?? 2,
    sellingCostOverride: property.sellingCostOverride ?? (legacySellingCosts ? legacySellingCosts : undefined),
    isBeingSold: property.isBeingSold ?? false,
    isForeignOwner: property.isForeignOwner ?? false,
    annualGrowthRate: property.annualGrowthRate ?? 6,
    projectionPeriod: property.projectionPeriod ?? 10,
  };
}

export function generatePropertyId(): string {
  return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
