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
}

export interface ApplicantResults {
  ownershipPercent: number;
  shareOfDeductions: number;
  netRentalPosition: number;
  estimatedTaxSaving: number;
}

export interface YearlyProjection {
  year: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  annualCashflow: number;
  cumulativeCashflow: number;
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

  const calculateApplicantTaxSaving = (applicant: ApplicantDetails): ApplicantResults => {
    const ownershipFraction = applicant.ownershipPercent / 100;
    const shareOfDeductions = totalDeductions * ownershipFraction;
    const shareOfRent = annualGrossRent * ownershipFraction;
    const applicantNetPosition = shareOfRent - shareOfDeductions;
    const effectiveTaxRate = applicant.includeMedicareLevy ? applicant.marginalTaxRate + 2 : applicant.marginalTaxRate;
    const taxSaving = applicantNetPosition < 0 ? Math.abs(applicantNetPosition) * (effectiveTaxRate / 100) : 0;
    return { ownershipPercent: applicant.ownershipPercent, shareOfDeductions, netRentalPosition: applicantNetPosition, estimatedTaxSaving: taxSaving };
  };

  const applicant1Results = calculateApplicantTaxSaving(inputs.applicant1);
  const applicant2Results = calculateApplicantTaxSaving(inputs.applicant2);
  const estimatedTaxSaving = applicant1Results.estimatedTaxSaving + applicant2Results.estimatedTaxSaving;

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
  const annualOutOfPocket = afterTaxAnnualCashflow < 0 ? Math.abs(afterTaxAnnualCashflow) : 0;
  const totalCashInvested = inputs.deposit + inputs.stampDuty + inputs.additionalBuyingCosts + (annualOutOfPocket * inputs.projectionPeriod);
  const simpleROI = totalCashInvested > 0 ? ((estimatedEquity - totalCashInvested) / totalCashInvested) * 100 : 0;
  const totalTaxSaved = estimatedTaxSaving * inputs.projectionPeriod;

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
  const netWealthCreated = (propertyGrowth + totalPrincipalPaidDown) - totalCashInvested;

  const yearlyProjections: YearlyProjection[] = [];
  let cumulativeCashflow = 0;

  for (let year = 1; year <= inputs.projectionPeriod; year++) {
    const yearPropertyValue = inputs.purchasePrice * Math.pow(1 + inputs.annualGrowthRate / 100, year);
    const yearRentGrowthFactor = Math.pow(1 + annualRentGrowthRate, year - 1);
    const yearAnnualGrossRent = annualGrossRent * yearRentGrowthFactor;
    const yearManagementFees = yearAnnualGrossRent * (inputs.propertyManagementFee / 100);
    const yearCashExpenses = annualInterest + yearManagementFees + inputs.annualRatesInsurance + inputs.maintenanceAllowance;
    const yearTotalDeductions = yearCashExpenses + totalDepreciation;

    let yearTaxSaving = 0;
    [inputs.applicant1, inputs.applicant2].forEach(applicant => {
      const f = applicant.ownershipPercent / 100;
      const pos = (yearAnnualGrossRent * f) - (yearTotalDeductions * f);
      const rate = applicant.includeMedicareLevy ? applicant.marginalTaxRate + 2 : applicant.marginalTaxRate;
      if (pos < 0) yearTaxSaving += Math.abs(pos) * (rate / 100);
    });

    const yearAfterTaxCashflow = yearTaxSaving - (yearCashExpenses - yearAnnualGrossRent);
    cumulativeCashflow += yearAfterTaxCashflow;

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
    });
  }

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
  };
}
