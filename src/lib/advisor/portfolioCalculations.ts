// Portfolio Calculations for Multi-Property Advisor Toolkit
import { PropertyData, PropertyResults, FutureProjection, HoldVsSellAnalysis, PortfolioSummary } from "./portfolioTypes";
import { calculateHistoricalStampDuty } from "./historicalStampDuty";
import { calculateStampDuty } from "./stampDuty";
import { calculateCGT, CGTInputs } from "./cgtCalculations";
import { calculateLandTax } from "./landTax";
import { calculateDepreciation } from "./depreciation";
import { calculateMarginalTaxRate } from "./taxRates";
import { calculatePMT, formatCurrency } from "./calculations";
import { getAverageRateForPeriod } from "./historicalRBArates";

const currentYear = new Date().getFullYear();
const ANNUAL_RENT_GROWTH_RATE = 0.05;

function getSellingCosts(property: PropertyData): number {
  if (property.sellingCostOverride !== undefined && property.sellingCostOverride > 0) return property.sellingCostOverride;
  return property.currentValue * (property.sellingCostPercent / 100);
}

export function calculatePropertyResults(
  property: PropertyData, applicant1Income: number, applicant2Income: number,
  isJointOwnership: boolean, applicant1OwnershipPercent: number
): PropertyResults {
  if (property.propertyMode === 'new-purchase') {
    return calculateNewPurchaseResults(property, applicant1Income, applicant2Income, isJointOwnership, applicant1OwnershipPercent);
  }

  const holdingPeriodYears = currentYear - property.purchaseYear;
  const totalGrowth = property.currentValue - property.purchasePrice;
  const totalGrowthPercent = property.purchasePrice > 0 ? (totalGrowth / property.purchasePrice) * 100 : 0;
  const annualizedGrowth = holdingPeriodYears > 0 ? (Math.pow(property.currentValue / property.purchasePrice, 1 / holdingPeriodYears) - 1) * 100 : 0;

  const stampDuty = calculateHistoricalStampDuty(property.purchasePrice, property.state, property.purchaseYear);
  const entryCosts = stampDuty + property.additionalBuyingCosts;
  const annualInterest = property.currentLoanBalance * (property.interestRate / 100);

  const historicalAvgRate = getAverageRateForPeriod(property.purchaseYear, currentYear, 2.0);
  let estimatedTotalInterestPaid = 0;
  if (property.loanType === 'interest-only') {
    estimatedTotalInterestPaid = property.originalLoanAmount * (historicalAvgRate / 100) * holdingPeriodYears;
  } else {
    const avgBalance = (property.originalLoanAmount + property.currentLoanBalance) / 2;
    estimatedTotalInterestPaid = avgBalance * (historicalAvgRate / 100) * holdingPeriodYears;
  }

  const principalRepaid = property.originalLoanAmount - property.currentLoanBalance;
  const sellingCosts = getSellingCosts(property);
  const weeksRented = 52 - property.vacancyWeeks;
  const annualGrossRent = property.weeklyRent * weeksRented;
  const managementFees = annualGrossRent * (property.propertyManagementFee / 100);

  const landTaxResult = calculateLandTax({
    state: property.state, landValue: property.landValue, totalPropertiesOwned: 1,
    isMainResidence: property.wasMainResidence && !property.wasEverRented,
    isPrimaryProduction: false, isForeignOwner: property.isForeignOwner,
  });

  const totalAnnualCashExpenses = annualInterest + managementFees + property.annualRatesInsurance + property.maintenanceAllowance + landTaxResult.annualLandTax;
  const depreciationResult = calculateDepreciation({ buildYear: property.buildYear, purchasePrice: property.purchasePrice, constructionCostOverride: property.constructionCostOverride });
  const annualDepreciation = depreciationResult.totalAnnualDepreciation;
  const annualDeductions = totalAnnualCashExpenses + annualDepreciation;

  const applicant1TaxRate = calculateMarginalTaxRate(applicant1Income);
  const applicant2TaxRate = calculateMarginalTaxRate(applicant2Income);
  const applicant1Share = applicant1OwnershipPercent / 100;
  const applicant2Share = isJointOwnership ? (1 - applicant1Share) : 0;

  let annualTaxBenefit = 0;
  const app1Net = (annualGrossRent * applicant1Share) - (annualDeductions * applicant1Share);
  if (app1Net < 0) annualTaxBenefit += Math.abs(app1Net) * ((applicant1TaxRate + 2) / 100);
  if (isJointOwnership) {
    const app2Net = (annualGrossRent * applicant2Share) - (annualDeductions * applicant2Share);
    if (app2Net < 0) annualTaxBenefit += Math.abs(app2Net) * ((applicant2TaxRate + 2) / 100);
  }

  const cashExpensesAfterRent = totalAnnualCashExpenses - annualGrossRent;
  const calcAfterTaxCashflow = annualTaxBenefit - cashExpensesAfterRent;
  const calcMonthlyShortfall = calcAfterTaxCashflow < 0 ? Math.abs(calcAfterTaxCashflow) / 12 : -calcAfterTaxCashflow / 12;
  const afterTaxMonthlyShortfall = property.monthlyOutOfPocketOverride !== undefined && property.monthlyOutOfPocketOverride > 0 ? property.monthlyOutOfPocketOverride : calcMonthlyShortfall;
  const afterTaxAnnualCashflow = -afterTaxMonthlyShortfall * 12;

  let cumulativeTaxBenefit = 0;
  let cumulativeAfterTaxShortfall = 0;
  for (let year = 1; year <= holdingPeriodYears; year++) {
    const rentGF = Math.pow(1 + ANNUAL_RENT_GROWTH_RATE, year - 1);
    const yGR = annualGrossRent * rentGF;
    const yMF = yGR * (property.propertyManagementFee / 100);
    const yCE = annualInterest + yMF + property.annualRatesInsurance + property.maintenanceAllowance + landTaxResult.annualLandTax;
    const yD = yCE + annualDepreciation;
    let yTB = 0;
    const yA1 = (yGR * applicant1Share) - (yD * applicant1Share);
    if (yA1 < 0) yTB += Math.abs(yA1) * ((applicant1TaxRate + 2) / 100);
    if (isJointOwnership) {
      const yA2 = (yGR * applicant2Share) - (yD * applicant2Share);
      if (yA2 < 0) yTB += Math.abs(yA2) * ((applicant2TaxRate + 2) / 100);
    }
    cumulativeTaxBenefit += yTB;
    const yATC = yTB - (yCE - yGR);
    if (yATC < 0) cumulativeAfterTaxShortfall += Math.abs(yATC);
  }

  const totalOutOfPocket = entryCosts + cumulativeAfterTaxShortfall;
  const totalHoldingCost = estimatedTotalInterestPaid + entryCosts + cumulativeAfterTaxShortfall;
  const grossYield = property.currentValue > 0 ? (annualGrossRent / property.currentValue) * 100 : 0;
  const netRentalIncome = annualGrossRent - totalAnnualCashExpenses;
  const netYield = property.currentValue > 0 ? (netRentalIncome / property.currentValue) * 100 : 0;

  let cgtPayable = 0;
  let netProceedsAfterCGT = property.currentValue - property.currentLoanBalance;
  let isFullyExempt = false;
  if (property.isBeingSold) {
    const cgtInputs: CGTInputs = {
      purchasePrice: property.purchasePrice, purchaseCosts: stampDuty + property.additionalBuyingCosts,
      currentValue: property.currentValue, sellingCosts, purchaseYear: property.purchaseYear,
      saleYear: currentYear, ownershipType: isJointOwnership ? 'joint' : 'individual',
      applicant1OwnershipPercent, applicant1TaxableIncome: applicant1Income,
      applicant1MarginalRate: applicant1TaxRate, applicant2TaxableIncome: applicant2Income,
      applicant2MarginalRate: applicant2TaxRate, wasMainResidence: property.wasMainResidence,
      usedFor6YearRule: property.useSixYearRule,
      sixYearRuleStartDate: property.useSixYearRule ? new Date(property.movedOutYear, 0, 1) : undefined,
      capitalImprovements: property.capitalImprovements, preCGTProperty: property.purchaseYear < 1985,
      wasEverRented: property.wasEverRented,
      rentalStartDate: property.wasEverRented ? new Date(property.rentalStartYear, 0, 1) : undefined,
      rentalEndDate: property.wasEverRented ? new Date(currentYear, 11, 31) : undefined,
    };
    const cgtResult = calculateCGT(cgtInputs);
    cgtPayable = cgtResult.totalCGTPayable;
    netProceedsAfterCGT = cgtResult.netProceedsAfterCGT;
    isFullyExempt = cgtResult.isFullyExempt;
  }

  const netWealthAfterCGT = totalGrowth - cgtPayable - totalOutOfPocket;

  return {
    holdingPeriodYears, totalGrowth, totalGrowthPercent, annualizedGrowth,
    stampDuty, entryCosts, totalOutOfPocket, estimatedTotalInterestPaid, totalHoldingCost,
    principalRepaid, grossYield, netYield, netRentalIncome, annualDepreciation,
    annualDeductions, annualTaxBenefit, cumulativeTaxBenefit,
    annualCashExpenses: totalAnnualCashExpenses, afterTaxAnnualCashflow,
    afterTaxMonthlyShortfall, cumulativeAfterTaxShortfall,
    cgtPayable, netProceedsAfterCGT, isFullyExempt, netWealthAfterCGT,
    annualLandTax: landTaxResult.annualLandTax, sellingCosts, historicalAvgRate,
  };
}

function calculateNewPurchaseResults(
  property: PropertyData, applicant1Income: number, applicant2Income: number,
  isJointOwnership: boolean, applicant1OwnershipPercent: number
): PropertyResults {
  const stampDuty = calculateStampDuty(property.purchasePrice, property.state);
  const entryCosts = stampDuty + property.additionalBuyingCosts;
  const annualInterest = property.currentLoanBalance * (property.interestRate / 100);
  let annualLoanRepayment: number;
  if (property.loanType === 'interest-only') { annualLoanRepayment = annualInterest; }
  else {
    const mr = property.interestRate / 100 / 12;
    annualLoanRepayment = calculatePMT(mr, property.loanTerm * 12, property.currentLoanBalance) * 12;
  }

  const weeksRented = 52 - property.vacancyWeeks;
  const annualGrossRent = property.weeklyRent * weeksRented;
  const managementFees = annualGrossRent * (property.propertyManagementFee / 100);
  const landTaxResult = calculateLandTax({ state: property.state, landValue: property.landValue, totalPropertiesOwned: 1, isMainResidence: false, isPrimaryProduction: false, isForeignOwner: property.isForeignOwner });
  const totalAnnualCashExpenses = annualInterest + managementFees + property.annualRatesInsurance + property.maintenanceAllowance + landTaxResult.annualLandTax;
  const depreciationResult = calculateDepreciation({ buildYear: property.isNewBuild ? currentYear : property.buildYear, purchasePrice: property.purchasePrice, constructionCostOverride: property.constructionCostOverride });
  const annualDepreciation = depreciationResult.totalAnnualDepreciation;
  const annualDeductions = totalAnnualCashExpenses + annualDepreciation;

  const applicant1TaxRate = calculateMarginalTaxRate(applicant1Income);
  const applicant2TaxRate = calculateMarginalTaxRate(applicant2Income);
  const a1s = applicant1OwnershipPercent / 100;
  const a2s = isJointOwnership ? (1 - a1s) : 0;
  let annualTaxBenefit = 0;
  const a1n = (annualGrossRent * a1s) - (annualDeductions * a1s);
  if (a1n < 0) annualTaxBenefit += Math.abs(a1n) * ((applicant1TaxRate + 2) / 100);
  if (isJointOwnership) { const a2n = (annualGrossRent * a2s) - (annualDeductions * a2s); if (a2n < 0) annualTaxBenefit += Math.abs(a2n) * ((applicant2TaxRate + 2) / 100); }

  const cashExpensesAfterRent = totalAnnualCashExpenses - annualGrossRent;
  const calcCashflow = annualTaxBenefit - cashExpensesAfterRent;
  const calcShortfall = calcCashflow < 0 ? Math.abs(calcCashflow) / 12 : -calcCashflow / 12;
  const afterTaxMonthlyShortfall = property.monthlyOutOfPocketOverride !== undefined && property.monthlyOutOfPocketOverride > 0 ? property.monthlyOutOfPocketOverride : calcShortfall;
  const afterTaxAnnualCashflow = -afterTaxMonthlyShortfall * 12;

  const projectionYears = property.projectionPeriod || 10;
  const projectedValue = property.purchasePrice * Math.pow(1 + property.annualGrowthRate / 100, projectionYears);
  const totalGrowth = projectedValue - property.purchasePrice;
  const totalGrowthPercent = (totalGrowth / property.purchasePrice) * 100;
  const cumulativeTaxBenefit = annualTaxBenefit * projectionYears;
  const cumulativeAfterTaxShortfall = afterTaxMonthlyShortfall > 0 ? afterTaxMonthlyShortfall * 12 * projectionYears : 0;
  const totalOutOfPocket = entryCosts + cumulativeAfterTaxShortfall;
  const estimatedTotalInterestPaid = annualInterest * projectionYears;
  const totalHoldingCost = estimatedTotalInterestPaid + entryCosts + cumulativeAfterTaxShortfall;
  const principalRepaid = property.loanType === 'principal-interest' ? (annualLoanRepayment - annualInterest) * projectionYears : 0;
  const grossYield = property.purchasePrice > 0 ? (annualGrossRent / property.purchasePrice) * 100 : 0;
  const netRentalIncome = annualGrossRent - totalAnnualCashExpenses;
  const netYield = property.purchasePrice > 0 ? (netRentalIncome / property.purchasePrice) * 100 : 0;
  const netWealthAfterCGT = totalGrowth - totalOutOfPocket;
  const sellingCosts = property.currentValue * (property.sellingCostPercent / 100);

  return {
    holdingPeriodYears: projectionYears, totalGrowth, totalGrowthPercent, annualizedGrowth: property.annualGrowthRate,
    stampDuty, entryCosts, totalOutOfPocket, estimatedTotalInterestPaid, totalHoldingCost, principalRepaid,
    grossYield, netYield, netRentalIncome, annualDepreciation, annualDeductions, annualTaxBenefit,
    cumulativeTaxBenefit, annualCashExpenses: totalAnnualCashExpenses, afterTaxAnnualCashflow,
    afterTaxMonthlyShortfall, cumulativeAfterTaxShortfall, cgtPayable: 0,
    netProceedsAfterCGT: projectedValue - (property.currentLoanBalance - principalRepaid) - sellingCosts,
    isFullyExempt: false, netWealthAfterCGT, annualLandTax: landTaxResult.annualLandTax,
    sellingCosts, historicalAvgRate: property.interestRate,
  };
}

export function calculateFutureProjections(
  property: PropertyData, results: PropertyResults, projectionYears: number,
  applicant1Income: number, applicant2Income: number,
  isJointOwnership: boolean, applicant1OwnershipPercent: number
): FutureProjection[] {
  const projections: FutureProjection[] = [];
  const growthRate = results.annualizedGrowth / 100;

  let annualPrincipalPayments: number[] = [];
  if (property.loanType === 'principal-interest') {
    const mr = property.interestRate / 100 / 12;
    const rm = property.loanTerm * 12;
    let balance = property.currentLoanBalance;
    if (mr > 0 && rm > 0 && balance > 0) {
      const mp = balance * (mr * Math.pow(1 + mr, rm)) / (Math.pow(1 + mr, rm) - 1);
      for (let year = 0; year <= projectionYears; year++) {
        let yp = 0;
        for (let month = 0; month < 12 && balance > 0; month++) {
          const ip = balance * mr;
          const pp = Math.min(balance, mp - ip);
          yp += pp;
          balance = Math.max(0, balance - pp);
        }
        annualPrincipalPayments.push(yp);
      }
    }
  }

  for (let i = 0; i <= projectionYears; i++) {
    const year = currentYear + i;
    const propertyValue = property.currentValue * Math.pow(1 + growthRate, i);
    let loanBalance: number;
    if (property.loanType === 'principal-interest' && annualPrincipalPayments.length > 0) {
      const totalPP = annualPrincipalPayments.slice(0, i + 1).reduce((s, p) => s + p, 0) - (annualPrincipalPayments[0] || 0);
      loanBalance = Math.max(0, property.currentLoanBalance - totalPP);
    } else {
      loanBalance = property.currentLoanBalance;
    }
    const equity = propertyValue - loanBalance;
    const futureShortfall = results.afterTaxMonthlyShortfall * 12 * i;

    const a1tr = calculateMarginalTaxRate(applicant1Income);
    const a2tr = calculateMarginalTaxRate(applicant2Income);
    const futureCgtInputs: CGTInputs = {
      purchasePrice: property.purchasePrice, purchaseCosts: results.stampDuty + property.additionalBuyingCosts,
      currentValue: propertyValue, sellingCosts: results.sellingCosts,
      purchaseYear: property.purchaseYear, saleYear: year,
      ownershipType: isJointOwnership ? 'joint' : 'individual', applicant1OwnershipPercent,
      applicant1TaxableIncome: applicant1Income, applicant1MarginalRate: a1tr,
      applicant2TaxableIncome: applicant2Income, applicant2MarginalRate: a2tr,
      wasMainResidence: property.wasMainResidence, usedFor6YearRule: property.useSixYearRule,
      sixYearRuleStartDate: property.useSixYearRule ? new Date(property.movedOutYear, 0, 1) : undefined,
      capitalImprovements: property.capitalImprovements, preCGTProperty: property.purchaseYear < 1985,
      wasEverRented: property.wasEverRented,
      rentalStartDate: property.wasEverRented ? new Date(property.rentalStartYear, 0, 1) : undefined,
      rentalEndDate: property.wasEverRented ? new Date(year, 11, 31) : undefined,
    };
    const futureCgt = calculateCGT(futureCgtInputs);
    const cgtIfSold = futureCgt.totalCGTPayable;
    const netProceedsIfSold = propertyValue - loanBalance - results.sellingCosts - cgtIfSold;
    const totalCashInvested = results.entryCosts + results.cumulativeAfterTaxShortfall + futureShortfall;
    const netWealthHolding = equity - totalCashInvested;
    const netWealthIfSold = netProceedsIfSold - totalCashInvested;

    projections.push({ year, propertyValue, loanBalance, equity, cumulativeShortfall: futureShortfall, totalCashInvested, netWealthHolding, cgtIfSold, netProceedsIfSold, netWealthIfSold });
  }
  return projections;
}

export function calculateHoldVsSell(
  property: PropertyData, results: PropertyResults, holdYears: number, etfReturnRate: number,
  applicant1Income: number, applicant2Income: number,
  isJointOwnership: boolean, applicant1OwnershipPercent: number
): HoldVsSellAnalysis {
  const growthRate = results.annualizedGrowth / 100;
  const holdPropertyValue = property.currentValue * Math.pow(1 + growthRate, holdYears);
  let holdLoanBalance = property.currentLoanBalance;
  if (property.loanType === 'principal-interest') {
    const mr = property.interestRate / 100 / 12;
    const rm = property.loanTerm * 12;
    let balance = property.currentLoanBalance;
    if (mr > 0 && rm > 0 && balance > 0) {
      const mp = balance * (mr * Math.pow(1 + mr, rm)) / (Math.pow(1 + mr, rm) - 1);
      for (let y = 0; y < holdYears; y++) { for (let m = 0; m < 12 && balance > 0; m++) { const ip = balance * mr; balance = Math.max(0, balance - Math.min(balance, mp - ip)); } }
      holdLoanBalance = balance;
    }
  }
  const holdEquity = holdPropertyValue - holdLoanBalance;
  const holdTotalShortfall = results.afterTaxMonthlyShortfall * 12 * holdYears;
  const a1tr = calculateMarginalTaxRate(applicant1Income);
  const a2tr = calculateMarginalTaxRate(applicant2Income);
  const holdCgtInputs: CGTInputs = {
    purchasePrice: property.purchasePrice, purchaseCosts: results.stampDuty + property.additionalBuyingCosts,
    currentValue: holdPropertyValue, sellingCosts: results.sellingCosts,
    purchaseYear: property.purchaseYear, saleYear: currentYear + holdYears,
    ownershipType: isJointOwnership ? 'joint' : 'individual', applicant1OwnershipPercent,
    applicant1TaxableIncome: applicant1Income, applicant1MarginalRate: a1tr,
    applicant2TaxableIncome: applicant2Income, applicant2MarginalRate: a2tr,
    wasMainResidence: property.wasMainResidence, usedFor6YearRule: property.useSixYearRule,
    sixYearRuleStartDate: property.useSixYearRule ? new Date(property.movedOutYear, 0, 1) : undefined,
    capitalImprovements: property.capitalImprovements, preCGTProperty: property.purchaseYear < 1985,
    wasEverRented: property.wasEverRented,
    rentalStartDate: property.wasEverRented ? new Date(property.rentalStartYear, 0, 1) : undefined,
    rentalEndDate: property.wasEverRented ? new Date(currentYear + holdYears, 11, 31) : undefined,
  };
  const holdCgtResult = calculateCGT(holdCgtInputs);
  const holdCGT = holdCgtResult.totalCGTPayable;
  const holdNetProceeds = holdPropertyValue - holdLoanBalance - results.sellingCosts - holdCGT;
  const holdNetWealth = (holdPropertyValue - property.purchasePrice) - holdCGT - (results.totalOutOfPocket + holdTotalShortfall);

  const sellNetProceeds = (property.currentValue - property.currentLoanBalance) - results.sellingCosts - results.cgtPayable;
  const monthlyContribution = Math.max(0, results.afterTaxMonthlyShortfall);
  const mr = etfReturnRate / 100 / 12;
  const months = holdYears * 12;
  const lumpSumFV = sellNetProceeds * Math.pow(1 + mr, months);
  const contributionFV = monthlyContribution > 0 ? monthlyContribution * ((Math.pow(1 + mr, months) - 1) / mr) : 0;
  const reinvestmentFinalValue = lumpSumFV + contributionFV;
  const reinvestmentGrowth = reinvestmentFinalValue - sellNetProceeds - (monthlyContribution * months);
  const reinvestmentNetWealth = reinvestmentGrowth;
  const holdAdvantage = holdNetWealth - reinvestmentNetWealth;

  let recommendation: 'hold' | 'sell' | 'neutral';
  let reasoning: string;
  if (holdAdvantage > 50000) { recommendation = 'hold'; reasoning = `Holding is projected to create ${formatCurrency(holdAdvantage)} more wealth over ${holdYears} years.`; }
  else if (holdAdvantage < -50000) { recommendation = 'sell'; reasoning = `Selling and reinvesting could create ${formatCurrency(Math.abs(holdAdvantage))} more wealth over ${holdYears} years.`; }
  else { recommendation = 'neutral'; reasoning = `Both strategies produce similar outcomes. Consider lifestyle factors, liquidity needs, and risk tolerance.`; }

  return { holdPropertyValue, holdEquity, holdCGT, holdNetProceeds, holdTotalShortfall, holdNetWealth, sellNetProceeds, reinvestmentGrowth, reinvestmentFinalValue, reinvestmentNetWealth, holdAdvantage, recommendation, reasoning };
}

export function calculatePortfolioSummary(properties: PropertyData[], resultsMap: Map<string, PropertyResults>): PortfolioSummary {
  let totalCurrentValue = 0, totalPurchasePrice = 0, totalGrowth = 0, totalCashInvested = 0;
  let totalCGTPayable = 0, totalMonthlyShortfall = 0, totalLoanBalance = 0, totalEquity = 0, totalNetProceedsIfSold = 0;
  properties.forEach(property => {
    const results = resultsMap.get(property.id);
    if (results) {
      totalCurrentValue += property.currentValue; totalPurchasePrice += property.purchasePrice;
      totalGrowth += results.totalGrowth; totalCashInvested += results.entryCosts + results.cumulativeAfterTaxShortfall;
      totalCGTPayable += results.cgtPayable; totalMonthlyShortfall += results.afterTaxMonthlyShortfall;
      totalLoanBalance += property.currentLoanBalance;
      totalEquity += property.currentValue - property.currentLoanBalance;
      totalNetProceedsIfSold += results.netProceedsAfterCGT;
    }
  });
  return {
    totalProperties: properties.length, totalCurrentValue, totalPurchasePrice, totalGrowth,
    totalCashInvested, totalCGTPayable, totalMonthlyShortfall, totalLoanBalance, totalEquity,
    totalNetWealthHolding: totalEquity - totalCashInvested,
    totalNetProceedsIfSold, totalNetWealthIfSold: totalNetProceedsIfSold - totalCashInvested,
  };
}
