export interface SimulatorInputs {
  currentHomeValue: number;
  mortgageOwing: number;
  sellingCostPercent: number;
  targetPurchasePrice: number;
  annualGrowthPercent: number;
  monthsToWait: number;
  buyingCostPercent: number;
  savings: number;
  homeValueAdjustment: number;
  /** Annual interest rate (%) used to estimate extra interest cost of waiting. Defaults to 6 if omitted. */
  repaymentRatePercent?: number;
  /** Loan term in years for the cost-of-waiting interest estimate. Defaults to 30. */
  loanTermYears?: number;
}

export interface SimulatorOutputs {
  // Adjusted home value (after sale price adjustment)
  adjustedHomeValue: number;

  // Now
  sellingCosts: number;
  usableEquity: number;
  purchaseCostsNow: number;
  totalFundsNeededNow: number;
  loanRequiredNow: number;
  gapNow: number;

  // Future
  futureHomeValue: number;
  futureTargetPrice: number;
  futureSellingCosts: number;
  futureUsableEquity: number;
  futurePurchaseCosts: number;
  futureTotalFundsNeeded: number;
  futureLoanRequired: number;
  gapLater: number;

  // Delta
  extraLoanFromWaiting: number;

  // Cost of Waiting
  extraPurchasePrice: number;
  extraInterestOverTerm: number;
  totalCostOfWaiting: number;

  // Timeline data (for chart)
  timeline: { month: number; loanRequired: number }[];
}

export function runSimulator(inputs: SimulatorInputs): SimulatorOutputs {
  const {
    currentHomeValue,
    mortgageOwing,
    sellingCostPercent,
    targetPurchasePrice,
    annualGrowthPercent,
    monthsToWait,
    buyingCostPercent,
    savings,
    homeValueAdjustment,
  } = inputs;

  const monthlyRate = Math.pow(1 + annualGrowthPercent / 100, 1 / 12) - 1;
  const adjustedHomeValue = currentHomeValue + homeValueAdjustment;

  // --- NOW ---
  const sellingCosts = adjustedHomeValue * (sellingCostPercent / 100);
  const usableEquity = Math.max(0, adjustedHomeValue - sellingCosts - mortgageOwing);
  const purchaseCostsNow = targetPurchasePrice * (buyingCostPercent / 100);
  const totalFundsNeededNow = targetPurchasePrice + purchaseCostsNow;
  const loanRequiredNow = Math.max(0, totalFundsNeededNow - usableEquity - savings);
  const gapNow = targetPurchasePrice - adjustedHomeValue;

  // --- FUTURE ---
  const futureHomeValue = adjustedHomeValue * Math.pow(1 + monthlyRate, monthsToWait);
  const futureTargetPrice = targetPurchasePrice * Math.pow(1 + monthlyRate, monthsToWait);
  const futureSellingCosts = futureHomeValue * (sellingCostPercent / 100);
  const futureUsableEquity = Math.max(0, futureHomeValue - futureSellingCosts - mortgageOwing);
  const futurePurchaseCosts = futureTargetPrice * (buyingCostPercent / 100);
  const futureTotalFundsNeeded = futureTargetPrice + futurePurchaseCosts;
  const futureLoanRequired = Math.max(0, futureTotalFundsNeeded - futureUsableEquity - savings);
  const gapLater = futureTargetPrice - futureHomeValue;

  const extraLoanFromWaiting = futureLoanRequired - loanRequiredNow;

  // --- COST OF WAITING ---
  const extraPurchasePrice = futureTargetPrice - targetPurchasePrice;
  const ratePct = inputs.repaymentRatePercent ?? 6;
  const termYears = inputs.loanTermYears ?? 30;
  const monthlyLoanRate = ratePct / 100 / 12;
  const totalMonths = termYears * 12;
  let extraInterestOverTerm = 0;
  if (extraLoanFromWaiting > 0 && monthlyLoanRate > 0) {
    const extraMonthlyRepayment =
      (extraLoanFromWaiting * monthlyLoanRate * Math.pow(1 + monthlyLoanRate, totalMonths)) /
      (Math.pow(1 + monthlyLoanRate, totalMonths) - 1);
    extraInterestOverTerm = extraMonthlyRepayment * totalMonths - extraLoanFromWaiting;
  }
  const totalCostOfWaiting = extraPurchasePrice + extraInterestOverTerm;

  // --- TIMELINE ---
  const timeline: { month: number; loanRequired: number }[] = [];
  for (let m = 0; m <= 24; m++) {
    const fhv = adjustedHomeValue * Math.pow(1 + monthlyRate, m);
    const ftp = targetPurchasePrice * Math.pow(1 + monthlyRate, m);
    const fsc = fhv * (sellingCostPercent / 100);
    const fue = Math.max(0, fhv - fsc - mortgageOwing);
    const fpc = ftp * (buyingCostPercent / 100);
    const ftfn = ftp + fpc;
    const flr = Math.max(0, ftfn - fue - savings);
    timeline.push({ month: m, loanRequired: flr });
  }

  return {
    adjustedHomeValue,
    sellingCosts,
    usableEquity,
    purchaseCostsNow,
    totalFundsNeededNow,
    loanRequiredNow,
    gapNow,
    futureHomeValue,
    futureTargetPrice,
    futureSellingCosts,
    futureUsableEquity,
    futurePurchaseCosts,
    futureTotalFundsNeeded,
    futureLoanRequired,
    gapLater,
    extraLoanFromWaiting,
    extraPurchasePrice,
    extraInterestOverTerm,
    totalCostOfWaiting,
    timeline,
  };
}
