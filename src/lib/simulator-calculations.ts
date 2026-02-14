import { calculateStampDuty } from './stamp-duty';

export interface SimulatorInputs {
  currentHomeValue: number;
  mortgageOwing: number;
  sellingCostPercent: number;
  targetPurchasePrice: number;
  state: string;
  annualGrowthPercent: number;
  monthsToWait: number;
  conveyancingCost: number;
}

export interface SimulatorOutputs {
  // Now
  sellingCosts: number;
  usableEquity: number;
  stampDutyNow: number;
  purchaseCostsNow: number;
  totalFundsNeededNow: number;
  loanRequiredNow: number;
  gapNow: number;

  // Future
  futureHomeValue: number;
  futureTargetPrice: number;
  futureSellingCosts: number;
  futureUsableEquity: number;
  futureStampDuty: number;
  futurePurchaseCosts: number;
  futureTotalFundsNeeded: number;
  futureLoanRequired: number;
  gapLater: number;

  // Delta
  extraLoanFromWaiting: number;

  // Timeline data (for chart)
  timeline: { month: number; loanRequired: number }[];
}

export function runSimulator(inputs: SimulatorInputs): SimulatorOutputs {
  const {
    currentHomeValue,
    mortgageOwing,
    sellingCostPercent,
    targetPurchasePrice,
    state,
    annualGrowthPercent,
    monthsToWait,
    conveyancingCost,
  } = inputs;

  const monthlyRate = Math.pow(1 + annualGrowthPercent / 100, 1 / 12) - 1;

  // --- NOW ---
  const sellingCosts = currentHomeValue * (sellingCostPercent / 100);
  const usableEquity = Math.max(0, currentHomeValue - sellingCosts - mortgageOwing);
  const stampDutyNow = calculateStampDuty(targetPurchasePrice, state);
  const purchaseCostsNow = stampDutyNow + conveyancingCost;
  const totalFundsNeededNow = targetPurchasePrice + purchaseCostsNow;
  const loanRequiredNow = Math.max(0, totalFundsNeededNow - usableEquity);
  const gapNow = targetPurchasePrice - currentHomeValue;

  // --- FUTURE ---
  const futureHomeValue = currentHomeValue * Math.pow(1 + monthlyRate, monthsToWait);
  const futureTargetPrice = targetPurchasePrice * Math.pow(1 + monthlyRate, monthsToWait);
  const futureSellingCosts = futureHomeValue * (sellingCostPercent / 100);
  const futureUsableEquity = Math.max(0, futureHomeValue - futureSellingCosts - mortgageOwing);
  const futureStampDuty = calculateStampDuty(futureTargetPrice, state);
  const futurePurchaseCosts = futureStampDuty + conveyancingCost;
  const futureTotalFundsNeeded = futureTargetPrice + futurePurchaseCosts;
  const futureLoanRequired = Math.max(0, futureTotalFundsNeeded - futureUsableEquity);
  const gapLater = futureTargetPrice - futureHomeValue;

  const extraLoanFromWaiting = futureLoanRequired - loanRequiredNow;

  // --- TIMELINE ---
  const timeline: { month: number; loanRequired: number }[] = [];
  for (let m = 0; m <= 24; m++) {
    const fhv = currentHomeValue * Math.pow(1 + monthlyRate, m);
    const ftp = targetPurchasePrice * Math.pow(1 + monthlyRate, m);
    const fsc = fhv * (sellingCostPercent / 100);
    const fue = Math.max(0, fhv - fsc - mortgageOwing);
    const fsd = calculateStampDuty(ftp, state);
    const fpc = fsd + conveyancingCost;
    const ftfn = ftp + fpc;
    const flr = Math.max(0, ftfn - fue);
    timeline.push({ month: m, loanRequired: flr });
  }

  return {
    sellingCosts,
    usableEquity,
    stampDutyNow,
    purchaseCostsNow,
    totalFundsNeededNow,
    loanRequiredNow,
    gapNow,
    futureHomeValue,
    futureTargetPrice,
    futureSellingCosts,
    futureUsableEquity,
    futureStampDuty,
    futurePurchaseCosts,
    futureTotalFundsNeeded,
    futureLoanRequired,
    gapLater,
    extraLoanFromWaiting,
    timeline,
  };
}
