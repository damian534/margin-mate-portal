// Investment Property Calculator Logic
import { AustralianState } from "./stampDuty";

export interface ApplicantDetails {
  annualTaxableIncome: number;
  marginalTaxRate: number;
  includeMedicareLevy: boolean;
  ownershipPercent: number;
}

export interface CalculatorInputs {
  applicant1: ApplicantDetails;
  applicant2: ApplicantDetails;
  purchasePrice: number;
  deposit: number;
  loanAmount: number;
  interestRate: number;
  loanType: 'interest-only' | 'principal-interest';
  loanTerm: number;
  stampDuty: number;
  state: AustralianState;
  additionalBuyingCosts: number;
  weeklyRent: number;
  propertyManagementFee: number;
  annualRatesInsurance: number;
  maintenanceAllowance: number;
  vacancyWeeks: number;
  capitalWorksDepreciation: number;
  plantEquipmentDepreciation: number;
  annualGrowthRate: number;
  projectionPeriod: number;
  /** New builds keep immediate negative gearing; established purchases have losses quarantined */
  isNewBuild: boolean;
  /** Annual indexation applied to quarantined carried-forward losses (%) */
  lossIndexationRate: number;
  /** Agent/legal costs on sale (% of sale price) */
  sellingCostsPercent: number;
}

export interface ApplicantResults {
  ownershipPercent: number;
  shareOfDeductions: number;
  netRentalPosition: number;
  estimatedTaxSaving: number;
  carriedForwardLosses: number;
  cgtPayable: number;
}

export interface YearlyProjection {
  year: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  annualCashflow: number;
  cumulativeCashflow: number;
  taxBenefit: number;
  carriedForwardLosses: number;
}

export interface SaleAnalysis {
  saleYear: number;
  salePrice: number;
  sellingCosts: number;
  loanPayout: number;
  costBase: number;
  capitalWorksClaimed: number;
  grossCapitalGain: number;
  lossesAppliedToGain: number;
  gainAfterLosses: number;
  discountedGain: number;
  cgtPayable: number;
  netSaleProceeds: number;
  netWealthAfterSale: number;
  unusedLosses: number;
}

export interface CalculationResults {
  loanAmount: number;
  annualInterest: number;
  annualLoanRepayment: number;
  annualGrossRent: number;
  totalAnnualCashExpenses: number;
  applicant1Results: ApplicantResults;
  applicant2Results: ApplicantResults;
  totalDeductions: number;
  netRentalPosition: number;
  estimatedTaxSaving: number;
  afterTaxAnnualCashflow: number;
  afterTaxMonthlyHoldingCost: number;
  breakEvenWeeklyRent: number;
  futurePropertyValue: number;
  futureLoanBalance: number;
  estimatedEquity: number;
  totalCashInvested: number;
  simpleROI: number;
  totalTaxSaved: number;
  totalInterestPaid: number;
  totalOperatingExpenses: number;
  totalGrossRentReceived: number;
  totalPrincipalPaidDown: number;
  propertyGrowth: number;
  netWealthCreated: number;
  yearlyProjections: YearlyProjection[];
  negativeGearingEligible: boolean;
  totalQuarantinedLosses: number;
  lossesOffsetAgainstRent: number;
  carriedForwardLossesAtSale: number;
  saleAnalysis: SaleAnalysis;
}

function calculatePMT(rate: number, nper: number, pv: number): number {
  if (rate === 0) return pv / nper;
  const pvif = Math.pow(1 + rate, nper);
  return (rate * pv * pvif) / (pvif - 1);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency', currency: 'AUD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function calculateResults(inputs: CalculatorInputs): CalculationResults {
  const loanAmount = inputs.loanAmount;
  const annualInterest = loanAmount * (inputs.interestRate / 100);

  let annualLoanRepayment: number;
  if (inputs.loanType === 'interest-only') {
    annualLoanRepayment = annualInterest;
  } else {
    const monthlyRate = inputs.interestRate / 100 / 12;
    const numberOfPayments = inputs.loanTerm * 12;
    annualLoanRepayment = calculatePMT(monthlyRate, numberOfPayments, loanAmount) * 12;
  }

  const weeksRented = 52 - inputs.vacancyWeeks;
  const annualGrossRent = inputs.weeklyRent * weeksRented;
  const managementFees = annualGrossRent * (inputs.propertyManagementFee / 100);
  const totalAnnualCashExpenses = annualInterest + managementFees + inputs.annualRatesInsurance + inputs.maintenanceAllowance;

  const totalDepreciation = inputs.capitalWorksDepreciation + inputs.plantEquipmentDepreciation;
  const totalDeductions = totalAnnualCashExpenses + totalDepreciation;
  const netRentalPosition = annualGrossRent - totalDeductions;

  // Under the new rules, only new builds can offset rental losses against other income.
  // Established purchases have their losses quarantined, indexed, and carried forward.
  const negativeGearingEligible = inputs.isNewBuild;
  const effectiveRate = (a: ApplicantDetails) => (a.includeMedicareLevy ? a.marginalTaxRate + 2 : a.marginalTaxRate) / 100;

  const applicantYear1 = (applicant: ApplicantDetails) => {
    const ownershipFraction = applicant.ownershipPercent / 100;
    const shareOfDeductions = totalDeductions * ownershipFraction;
    const shareOfRent = annualGrossRent * ownershipFraction;
    const applicantNetPosition = shareOfRent - shareOfDeductions;
    const taxSaving = negativeGearingEligible && applicantNetPosition < 0
      ? Math.abs(applicantNetPosition) * effectiveRate(applicant)
      : 0;
    return { ownershipPercent: applicant.ownershipPercent, shareOfDeductions, netRentalPosition: applicantNetPosition, estimatedTaxSaving: taxSaving };
  };

  const a1Year1 = applicantYear1(inputs.applicant1);
  const a2Year1 = applicantYear1(inputs.applicant2);
  const estimatedTaxSaving = a1Year1.estimatedTaxSaving + a2Year1.estimatedTaxSaving;

  const cashExpensesAfterRent = totalAnnualCashExpenses - annualGrossRent;
  const afterTaxAnnualCashflow = estimatedTaxSaving - cashExpensesAfterRent;
  const afterTaxMonthlyHoldingCost = afterTaxAnnualCashflow < 0 ? Math.abs(afterTaxAnnualCashflow) / 12 : -afterTaxAnnualCashflow / 12;
  const breakEvenWeeklyRent = (totalAnnualCashExpenses - estimatedTaxSaving) / weeksRented;

  const futurePropertyValue = inputs.purchasePrice * Math.pow(1 + inputs.annualGrowthRate / 100, inputs.projectionPeriod);

  let futureLoanBalance: number;
  if (inputs.loanType === 'interest-only') {
    futureLoanBalance = loanAmount;
  } else {
    const monthlyRate = inputs.interestRate / 100 / 12;
    const monthlyPayment = calculatePMT(monthlyRate, inputs.loanTerm * 12, loanAmount);
    const monthsElapsed = inputs.projectionPeriod * 12;
    if (monthsElapsed >= inputs.loanTerm * 12) {
      futureLoanBalance = 0;
    } else {
      let balance = loanAmount;
      for (let m = 0; m < monthsElapsed; m++) {
        balance -= (monthlyPayment - balance * monthlyRate);
      }
      futureLoanBalance = Math.max(0, balance);
    }
  }

  const estimatedEquity = futurePropertyValue - futureLoanBalance;

  let totalInterestPaid = 0;
  if (inputs.loanType === 'interest-only') {
    totalInterestPaid = annualInterest * inputs.projectionPeriod;
  } else {
    const monthlyRate = inputs.interestRate / 100 / 12;
    const monthlyPayment = calculatePMT(monthlyRate, inputs.loanTerm * 12, loanAmount);
    let balance = loanAmount;
    const monthsToCalculate = Math.min(inputs.projectionPeriod * 12, inputs.loanTerm * 12);
    for (let m = 0; m < monthsToCalculate; m++) {
      const interestPayment = balance * monthlyRate;
      totalInterestPaid += interestPayment;
      balance -= (monthlyPayment - interestPayment);
      if (balance <= 0) break;
    }
  }

  const annualRentGrowthRate = 0.05;
  let totalOperatingExpenses = 0;
  let totalGrossRentReceived = 0;

  for (let year = 1; year <= inputs.projectionPeriod; year++) {
    const yearRentGrowthFactor = Math.pow(1 + annualRentGrowthRate, year - 1);
    const yearAnnualGrossRent = annualGrossRent * yearRentGrowthFactor;
    const yearManagementFees = yearAnnualGrossRent * (inputs.propertyManagementFee / 100);
    totalGrossRentReceived += yearAnnualGrossRent;
    totalOperatingExpenses += yearManagementFees + inputs.annualRatesInsurance + inputs.maintenanceAllowance;
  }

  const totalPrincipalPaidDown = loanAmount - futureLoanBalance;
  const propertyGrowth = futurePropertyValue - inputs.purchasePrice;

  const yearlyProjections: YearlyProjection[] = [];
  let cumulativeCashflow = 0;
  let totalOutOfPocket = 0;
  let totalTaxSaved = 0;
  let totalQuarantinedLosses = 0;
  let lossesOffsetAgainstRent = 0;
  const lossPools = [0, 0];
  const applicants = [inputs.applicant1, inputs.applicant2];
  const indexation = inputs.lossIndexationRate / 100;

  for (let year = 1; year <= inputs.projectionPeriod; year++) {
    const yearPropertyValue = inputs.purchasePrice * Math.pow(1 + inputs.annualGrowthRate / 100, year);
    const yearRentGrowthFactor = Math.pow(1 + annualRentGrowthRate, year - 1);
    const yearAnnualGrossRent = annualGrossRent * yearRentGrowthFactor;
    const yearManagementFees = yearAnnualGrossRent * (inputs.propertyManagementFee / 100);
    const yearCashExpenses = annualInterest + yearManagementFees + inputs.annualRatesInsurance + inputs.maintenanceAllowance;
    const yearTotalDeductions = yearCashExpenses + totalDepreciation;

    let yearTaxSaving = 0;
    applicants.forEach((applicant, i) => {
      const f = applicant.ownershipPercent / 100;
      if (f <= 0) return;
      const pos = (yearAnnualGrossRent * f) - (yearTotalDeductions * f);
      const rate = effectiveRate(applicant);
      if (pos < 0) {
        if (negativeGearingEligible) {
          yearTaxSaving += Math.abs(pos) * rate;
        } else {
          lossPools[i] += Math.abs(pos);
          totalQuarantinedLosses += Math.abs(pos);
        }
      } else if (pos > 0) {
        const offset = Math.min(pos, lossPools[i]);
        lossPools[i] -= offset;
        lossesOffsetAgainstRent += offset;
        yearTaxSaving -= (pos - offset) * rate; // tax cost on positively geared income
      }
      // index the carried-forward loss balance
      lossPools[i] *= 1 + indexation;
    });
    totalTaxSaved += yearTaxSaving;

    const yearAfterTaxCashflow = yearTaxSaving - (yearCashExpenses - yearAnnualGrossRent);
    cumulativeCashflow += yearAfterTaxCashflow;
    if (yearAfterTaxCashflow < 0) totalOutOfPocket += Math.abs(yearAfterTaxCashflow);

    let yearLoanBalance: number;
    if (inputs.loanType === 'interest-only') {
      yearLoanBalance = loanAmount;
    } else {
      const monthlyRate = inputs.interestRate / 100 / 12;
      const monthlyPayment = calculatePMT(monthlyRate, inputs.loanTerm * 12, loanAmount);
      const monthsElapsed = year * 12;
      if (monthsElapsed >= inputs.loanTerm * 12) {
        yearLoanBalance = 0;
      } else {
        let balance = loanAmount;
        for (let m = 0; m < monthsElapsed; m++) {
          balance -= (monthlyPayment - balance * monthlyRate);
        }
        yearLoanBalance = Math.max(0, balance);
      }
    }

    yearlyProjections.push({
      year,
      propertyValue: yearPropertyValue,
      loanBalance: yearLoanBalance,
      equity: yearPropertyValue - yearLoanBalance,
      annualCashflow: yearAfterTaxCashflow,
      cumulativeCashflow,
      taxBenefit: yearTaxSaving,
      carriedForwardLosses: lossPools[0] + lossPools[1],
    });
  }

  const totalCashInvested = inputs.deposit + inputs.stampDuty + inputs.additionalBuyingCosts + totalOutOfPocket;
  const simpleROI = totalCashInvested > 0 ? ((estimatedEquity - totalCashInvested) / totalCashInvested) * 100 : 0;
  const netWealthCreated = (propertyGrowth + totalPrincipalPaidDown) - totalCashInvested;
  const carriedForwardLossesAtSale = lossPools[0] + lossPools[1];

  // ── Sale & CGT at the end of the projection period ──
  const salePrice = futurePropertyValue;
  const sellingCosts = salePrice * (inputs.sellingCostsPercent / 100);
  const capitalWorksClaimed = inputs.capitalWorksDepreciation * inputs.projectionPeriod;
  const costBase = inputs.purchasePrice + inputs.stampDuty + inputs.additionalBuyingCosts - capitalWorksClaimed;
  const grossCapitalGain = Math.max(0, salePrice - sellingCosts - costBase);
  const eligibleForDiscount = inputs.projectionPeriod >= 1;

  let lossesAppliedToGain = 0;
  let gainAfterLosses = 0;
  let discountedGain = 0;
  let totalCGT = 0;
  const applicantCGT = [0, 0];

  applicants.forEach((applicant, i) => {
    const f = applicant.ownershipPercent / 100;
    if (f <= 0) return;
    const shareOfGain = grossCapitalGain * f;
    const applied = Math.min(shareOfGain, lossPools[i]);
    lossPools[i] -= applied;
    lossesAppliedToGain += applied;
    const netGain = shareOfGain - applied;
    const taxable = eligibleForDiscount ? netGain * 0.5 : netGain;
    gainAfterLosses += netGain;
    discountedGain += taxable;
    const cgt = taxable * effectiveRate(applicant);
    applicantCGT[i] = cgt;
    totalCGT += cgt;
  });

  const netSaleProceeds = salePrice - sellingCosts - futureLoanBalance - totalCGT;
  const netWealthAfterSale = netSaleProceeds - totalCashInvested;

  const saleAnalysis: SaleAnalysis = {
    saleYear: inputs.projectionPeriod,
    salePrice, sellingCosts, loanPayout: futureLoanBalance,
    costBase, capitalWorksClaimed, grossCapitalGain,
    lossesAppliedToGain, gainAfterLosses, discountedGain,
    cgtPayable: totalCGT, netSaleProceeds, netWealthAfterSale,
    unusedLosses: lossPools[0] + lossPools[1],
  };

  const applicant1Results: ApplicantResults = { ...a1Year1, carriedForwardLosses: 0, cgtPayable: applicantCGT[0] };
  const applicant2Results: ApplicantResults = { ...a2Year1, carriedForwardLosses: 0, cgtPayable: applicantCGT[1] };

  return {
    loanAmount, annualInterest, annualLoanRepayment,
    annualGrossRent, totalAnnualCashExpenses,
    applicant1Results, applicant2Results,
    totalDeductions, netRentalPosition, estimatedTaxSaving,
    afterTaxAnnualCashflow, afterTaxMonthlyHoldingCost, breakEvenWeeklyRent,
    futurePropertyValue, futureLoanBalance, estimatedEquity,
    totalCashInvested, simpleROI, totalTaxSaved,
    totalInterestPaid, totalOperatingExpenses, totalGrossRentReceived,
    totalPrincipalPaidDown, propertyGrowth, netWealthCreated,
    yearlyProjections,
    negativeGearingEligible, totalQuarantinedLosses, lossesOffsetAgainstRent,
    carriedForwardLossesAtSale,
    saleAnalysis,
  };
}
