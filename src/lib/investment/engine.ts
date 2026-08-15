// ─────────────────────────────────────────────────────────────
// Investment property engine: purchase → year-by-year → sale →
// CGT → debt repaid → final after-tax cash → true wealth created.
// All maths runs at full precision; rounding is a display concern.
// ─────────────────────────────────────────────────────────────
import {
  PropertyTaxCategory, taxRules, taxDelta, marginalRate,
  negativeGearingAllowed, isGrandfatheredByDate,
} from "./taxRules";

export interface Investor {
  name: string;
  taxableIncome: number;
  includeMedicare: boolean;
  ownershipPercent: number;
}

export interface CapitalImprovement {
  year: number;
  amount: number;
  description: string;
}

export interface OperatingExpenseInputs {
  managementFeePercent: number;
  lettingFeesWeeks: number;
  councilRates: number;
  waterCharges: number;
  strata: number;
  buildingInsurance: number;
  landlordInsurance: number;
  maintenance: number;
  repairs: number;
  landTax: number;
  accountingFees: number;
  complianceCosts: number;
  otherExpenses: number;
}

export interface EngineInputs {
  propertyType: PropertyTaxCategory;
  purchaseDate: string; // ISO date

  purchasePrice: number;
  stampDuty: number;
  legalFees: number;
  buyersAgentFee: number;
  otherAcquisitionCosts: number;
  loanEstablishmentCosts: number;

  deposit: number;
  loanAmount: number;
  interestRate: number;
  loanTerm: number;
  interestOnlyYears: number;

  weeklyRent: number;
  rentalGrowthRate: number;
  vacancyRatePercent: number;
  otherPropertyIncome: number;

  expenses: OperatingExpenseInputs;
  indexExpensesWithInflation: boolean;
  inflationRate: number;

  depreciationEnabled: boolean;
  div40Annual: number;
  div43Annual: number;

  capitalGrowthRate: number;
  holdYears: number;
  improvements: CapitalImprovement[];

  agentCommissionPercent: number;
  marketingCosts: number;
  saleLegalFees: number;
  dischargeCosts: number;
  otherSellingCosts: number;

  investors: Investor[];
  cgtMethod: "auto" | "discount" | "indexation";

  opportunityCostEnabled: boolean;
  alternativeReturnRate: number;
}

export interface YearRow {
  year: number;
  openingPropertyValue: number;
  capitalGrowth: number;
  closingPropertyValue: number;
  openingLoanBalance: number;
  interestPaid: number;
  principalRepaid: number;
  closingLoanBalance: number;
  grossEquity: number;
  grossRent: number;
  effectiveRentalIncome: number;
  operatingExpenses: number;
  depreciation: number;
  taxableResult: number;
  negativeGearingAllowedThisYear: boolean;
  lossOpening: number;
  lossUsed: number;
  lossAdded: number;
  lossClosing: number;
  taxBenefit: number;
  capitalImprovements: number;
  cashflowBeforeTax: number;
  cashflowAfterTax: number;
  investorCashContributed: number;
  cumulativeInvestorCash: number;
  cumulativeCashflowReceived: number;
}

export interface CgtOutcome {
  method: "discount" | "indexation" | "blended";
  nominalGain: number;
  inflationAdjustment: number;
  realGain: number;
  lossesApplied: number;
  netTaxableGain: number;
  cgtPayable: number;
  minimumRateApplied: boolean;
}

export interface SaleReconciliation {
  saleYear: number;
  salePrice: number;
  agentCommission: number;
  totalSellingCosts: number;
  costBase: number;
  capitalWorksClaimed: number;
  grossCapitalGain: number;
  cgt: CgtOutcome;
  discountMethodCgt: number;
  indexationMethodCgt: number;
  methodDifference: number;
  outstandingLoan: number;
  netSaleProceeds: number;
  carriedForwardLossesBeforeSale: number;
  carriedForwardLossesUsedAtSale: number;
  unusedLossesAtSale: number;
}

export interface EngineResults {
  rulesVersion: string;
  isGrandfathered: boolean;
  effectiveCategory: PropertyTaxCategory;

  initialCashContribution: number;
  years: YearRow[];
  sale: SaleReconciliation;

  totalRentalIncome: number;
  totalOperatingExpenses: number;
  totalInterestPaid: number;
  totalPrincipalRepaid: number;
  totalDepreciationClaimed: number;
  totalTaxBenefits: number;
  totalCapitalImprovements: number;

  propertyValueAtSale: number;
  loanBalanceAtSale: number;
  grossEquityAtSale: number;

  totalInvestorCashContributed: number;
  cumulativeNetCashflowReceived: number;
  netCashReceivedAfterSale: number;
  trueNetWealthCreated: number;
  realWealthTodaysDollars: number;
  propertyGrowth: number;
  returnOnInvestorCapital: number;
  investorIRR: number;

  opportunityCostValue: number | null;
  opportunityCostDifference: number | null;

  cashflowSeries: number[];
  marginalRates: number[];
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date.getTime());
  d.setFullYear(d.getFullYear() + years);
  return d;
}

/** Internal rate of return via bisection over a well-behaved bracket. */
export function calculateIRR(cashflows: number[]): number {
  const npv = (rate: number) =>
    cashflows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + rate, t), 0);
  let low = -0.9499;
  let high = 5;
  let fLow = npv(low);
  let fHigh = npv(high);
  if (fLow * fHigh > 0) return NaN;
  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLow * fMid < 0) { high = mid; fHigh = fMid; } else { low = mid; fLow = fMid; }
  }
  return (low + high) / 2;
}

interface LoanYear { interest: number; principal: number; closing: number; }

function amortiseYear(
  openingBalance: number, annualRate: number, monthsElapsed: number,
  loanTermYears: number, interestOnlyYears: number,
): LoanYear {
  const monthlyRate = annualRate / 100 / 12;
  let balance = openingBalance;
  let interest = 0;
  let principal = 0;

  for (let m = 0; m < 12; m++) {
    const monthIndex = monthsElapsed + m;
    if (balance <= 0) break;
    const monthInterest = balance * monthlyRate;
    interest += monthInterest;
    const inInterestOnly = monthIndex < interestOnlyYears * 12;
    if (inInterestOnly) continue;
    const remainingMonths = loanTermYears * 12 - monthIndex;
    if (remainingMonths <= 0) break;
    const payment = monthlyRate === 0
      ? balance / remainingMonths
      : (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -remainingMonths));
    const monthPrincipal = Math.min(balance, payment - monthInterest);
    principal += monthPrincipal;
    balance -= monthPrincipal;
  }
  return { interest, principal, closing: Math.max(0, balance) };
}

export function runInvestmentEngine(inputs: EngineInputs): EngineResults {
  const purchaseDate = new Date(inputs.purchaseDate);
  const grandfathered = isGrandfatheredByDate(purchaseDate);
  const effectiveCategory: PropertyTaxCategory = grandfathered ? "grandfathered" : inputs.propertyType;

  const investors = inputs.investors.filter(i => i.ownershipPercent > 0);
  const acquisitionCosts =
    inputs.stampDuty + inputs.legalFees + inputs.buyersAgentFee + inputs.otherAcquisitionCosts;
  const initialCashContribution = inputs.deposit + acquisitionCosts + inputs.loanEstablishmentCosts;

  const inflation = inputs.inflationRate / 100;
  const rentGrowth = inputs.rentalGrowthRate / 100;
  const growth = inputs.capitalGrowthRate / 100;

  const lossPools = investors.map(() => 0);
  const years: YearRow[] = [];

  let loanBalance = inputs.loanAmount;
  let propertyValue = inputs.purchasePrice;
  let cumulativeInvestorCash = initialCashContribution;
  let cumulativeCashflowReceived = 0;
  let totalRentalIncome = 0;
  let totalOperatingExpenses = 0;
  let totalInterestPaid = 0;
  let totalPrincipalRepaid = 0;
  let totalDepreciationClaimed = 0;
  let totalCapitalWorksClaimed = 0;
  let totalTaxBenefits = 0;
  let totalCapitalImprovements = 0;

  const cashflowSeries: number[] = [-initialCashContribution];

  for (let year = 1; year <= inputs.holdYears; year++) {
    const yearEndDate = addYears(purchaseDate, year);
    const ngAllowed = negativeGearingAllowed(effectiveCategory, yearEndDate);

    const openingPropertyValue = propertyValue;
    const closingPropertyValue = openingPropertyValue * (1 + growth);

    // Rental income
    const rentFactor = Math.pow(1 + rentGrowth, year - 1);
    const inflationFactor = inputs.indexExpensesWithInflation ? Math.pow(1 + inflation, year - 1) : 1;
    const grossRent = inputs.weeklyRent * 52 * rentFactor + inputs.otherPropertyIncome * inflationFactor;
    const effectiveRentalIncome = grossRent * (1 - inputs.vacancyRatePercent / 100);

    // Operating expenses (management scales with rent, the rest with inflation if enabled)
    const e = inputs.expenses;
    const management = effectiveRentalIncome * (e.managementFeePercent / 100);
    const lettingFees = inputs.weeklyRent * rentFactor * e.lettingFeesWeeks;
    const fixedExpenses =
      (e.councilRates + e.waterCharges + e.strata + e.buildingInsurance + e.landlordInsurance +
        e.maintenance + e.repairs + e.landTax + e.accountingFees + e.complianceCosts + e.otherExpenses) *
      inflationFactor;
    const operatingExpenses = management + lettingFees + fixedExpenses;

    // Loan
    const loan = amortiseYear(loanBalance, inputs.interestRate, (year - 1) * 12, inputs.loanTerm, inputs.interestOnlyYears);
    const openingLoanBalance = loanBalance;
    loanBalance = loan.closing;

    // Depreciation
    const div43 = inputs.depreciationEnabled && year <= taxRules.capitalWorksLifeYears ? inputs.div43Annual : 0;
    const div40 = inputs.depreciationEnabled ? inputs.div40Annual : 0;
    const depreciation = div43 + div40;

    const taxableResult = effectiveRentalIncome - operatingExpenses - loan.interest - depreciation;

    // Per-investor tax treatment
    let taxBenefit = 0;
    let lossOpening = 0;
    let lossUsed = 0;
    let lossAdded = 0;

    investors.forEach((inv, i) => {
      const share = taxableResult * (inv.ownershipPercent / 100);
      lossOpening += lossPools[i];
      if (share < 0) {
        if (ngAllowed) {
          // negative adjustment to income => taxDelta is negative => a saving
          taxBenefit += -taxDelta(inv.taxableIncome, share, inv.includeMedicare);
        } else {
          lossPools[i] += Math.abs(share);
          lossAdded += Math.abs(share);
        }
      } else if (share > 0) {
        const used = Math.min(share, lossPools[i]);
        lossPools[i] -= used;
        lossUsed += used;
        const assessable = share - used;
        if (assessable > 0) {
          taxBenefit -= taxDelta(inv.taxableIncome, assessable, inv.includeMedicare);
        }
      }
    });

    const lossClosing = lossPools.reduce((a, b) => a + b, 0);

    const improvementsThisYear = inputs.improvements
      .filter(im => im.year === year)
      .reduce((sum, im) => sum + im.amount, 0);

    const cashflowBeforeTax = effectiveRentalIncome - operatingExpenses - loan.interest - loan.principal;
    const cashflowAfterTax = cashflowBeforeTax + taxBenefit - improvementsThisYear;

    const investorCashContributed = cashflowAfterTax < 0 ? Math.abs(cashflowAfterTax) : 0;
    cumulativeInvestorCash += investorCashContributed;
    if (cashflowAfterTax > 0) cumulativeCashflowReceived += cashflowAfterTax;

    totalRentalIncome += effectiveRentalIncome;
    totalOperatingExpenses += operatingExpenses;
    totalInterestPaid += loan.interest;
    totalPrincipalRepaid += loan.principal;
    totalDepreciationClaimed += depreciation;
    totalCapitalWorksClaimed += div43;
    totalTaxBenefits += taxBenefit;
    totalCapitalImprovements += improvementsThisYear;

    cashflowSeries.push(cashflowAfterTax);

    years.push({
      year,
      openingPropertyValue,
      capitalGrowth: closingPropertyValue - openingPropertyValue,
      closingPropertyValue,
      openingLoanBalance,
      interestPaid: loan.interest,
      principalRepaid: loan.principal,
      closingLoanBalance: loanBalance,
      grossEquity: closingPropertyValue - loanBalance,
      grossRent,
      effectiveRentalIncome,
      operatingExpenses,
      depreciation,
      taxableResult,
      negativeGearingAllowedThisYear: ngAllowed,
      lossOpening,
      lossUsed,
      lossAdded,
      lossClosing,
      taxBenefit,
      capitalImprovements: improvementsThisYear,
      cashflowBeforeTax,
      cashflowAfterTax,
      investorCashContributed,
      cumulativeInvestorCash,
      cumulativeCashflowReceived,
    });

    propertyValue = closingPropertyValue;
  }

  // ── SALE ──
  const saleDate = addYears(purchaseDate, inputs.holdYears);
  const salePrice = propertyValue;
  const agentCommission = salePrice * (inputs.agentCommissionPercent / 100);
  const totalSellingCosts =
    agentCommission + inputs.marketingCosts + inputs.saleLegalFees + inputs.dischargeCosts + inputs.otherSellingCosts;

  const costBase =
    inputs.purchasePrice + acquisitionCosts + totalCapitalImprovements - totalCapitalWorksClaimed;
  const grossCapitalGain = Math.max(0, salePrice - totalSellingCosts - costBase);

  // Apportion the gain either side of the CGT indexation start date
  const totalMs = saleDate.getTime() - purchaseDate.getTime();
  const indexStart = taxRules.cgtIndexationStartDate.getTime();
  const preMs = Math.max(0, Math.min(saleDate.getTime(), indexStart) - purchaseDate.getTime());
  const preFraction = totalMs > 0 ? Math.min(1, preMs / totalMs) : 1;
  const postFraction = 1 - preFraction;
  const postYears = (totalMs * postFraction) / (365.25 * 24 * 3600 * 1000);

  const eligibleForDiscount = inputs.holdYears * 12 >= taxRules.cgtDiscountMinimumMonths;
  const carriedForwardLossesBeforeSale = lossPools.reduce((a, b) => a + b, 0);

  // Inflation adjustment applies to the portion of the cost base attributable to the post-reform period
  const inflationAdjustment = grossCapitalGain > 0
    ? Math.min(
        grossCapitalGain * postFraction,
        costBase * postFraction * (Math.pow(1 + inflation, postYears) - 1),
      )
    : 0;

  /** Tax a gain across investors, applying carried-forward losses and (optionally) the minimum rate. */
  const taxGain = (
    perInvestorGain: (inv: Investor) => number,
    applyMinimumRate: boolean,
    applyLosses: boolean,
    discountRate: number,
    pools: number[],
  ) => {
    let cgt = 0;
    let lossesApplied = 0;
    let netTaxable = 0;
    let minApplied = false;
    investors.forEach((inv, i) => {
      let gain = perInvestorGain(inv);
      if (gain <= 0) return;
      if (applyLosses) {
        const used = Math.min(gain, pools[i]);
        pools[i] -= used;
        lossesApplied += used;
        gain -= used;
      }
      const taxable = gain * (1 - discountRate);
      netTaxable += taxable;
      const normalTax = taxDelta(inv.taxableIncome, taxable, inv.includeMedicare);
      let payable = normalTax;
      if (applyMinimumRate) {
        const minimum = taxable * taxRules.minimumCGTRate;
        if (minimum > normalTax) { payable = minimum; minApplied = true; }
      }
      cgt += payable;
    });
    return { cgt, lossesApplied, netTaxable, minApplied };
  };

  const share = (inv: Investor, amount: number) => amount * (inv.ownershipPercent / 100);

  // Option A — existing 50% discount on the whole nominal gain
  const poolsA = [...lossPools];
  const optionA = taxGain(inv => share(inv, grossCapitalGain), false, true, eligibleForDiscount ? taxRules.cgtDiscountRate : 0, poolsA);

  // Option B — indexation on the post-reform portion, discount on the pre-reform portion
  const poolsB = [...lossPools];
  const realGainPost = Math.max(0, grossCapitalGain * postFraction - inflationAdjustment);
  const gainPre = grossCapitalGain * preFraction;
  const preOutcome = taxGain(inv => share(inv, gainPre), false, true, eligibleForDiscount ? taxRules.cgtDiscountRate : 0, poolsB);
  const postOutcome = taxGain(inv => share(inv, realGainPost), true, true, 0, poolsB);
  const optionB = {
    cgt: preOutcome.cgt + postOutcome.cgt,
    lossesApplied: preOutcome.lossesApplied + postOutcome.lossesApplied,
    netTaxable: preOutcome.netTaxable + postOutcome.netTaxable,
    minApplied: postOutcome.minApplied,
  };

  // Established (non-grandfathered) property must use the new regime.
  // New builds and grandfathered assets may elect the better outcome.
  const canElect = effectiveCategory !== "established";
  let chosen: "discount" | "indexation";
  if (!canElect) chosen = "indexation";
  else if (inputs.cgtMethod === "discount") chosen = "discount";
  else if (inputs.cgtMethod === "indexation") chosen = "indexation";
  else chosen = optionA.cgt <= optionB.cgt ? "discount" : "indexation";

  const selected = chosen === "discount" ? optionA : optionB;
  const finalPools = chosen === "discount" ? poolsA : poolsB;
  const unusedLossesAtSale = finalPools.reduce((a, b) => a + b, 0);

  const cgt: CgtOutcome = {
    method: chosen,
    nominalGain: grossCapitalGain,
    inflationAdjustment: chosen === "indexation" ? inflationAdjustment : 0,
    realGain: chosen === "indexation" ? Math.max(0, grossCapitalGain - inflationAdjustment) : grossCapitalGain,
    lossesApplied: selected.lossesApplied,
    netTaxableGain: selected.netTaxable,
    cgtPayable: selected.cgt,
    minimumRateApplied: selected.minApplied,
  };

  const netSaleProceeds = salePrice - totalSellingCosts - loanBalance - cgt.cgtPayable;

  const sale: SaleReconciliation = {
    saleYear: inputs.holdYears,
    salePrice,
    agentCommission,
    totalSellingCosts,
    costBase,
    capitalWorksClaimed: totalCapitalWorksClaimed,
    grossCapitalGain,
    cgt,
    discountMethodCgt: optionA.cgt,
    indexationMethodCgt: optionB.cgt,
    methodDifference: Math.abs(optionA.cgt - optionB.cgt),
    outstandingLoan: loanBalance,
    netSaleProceeds,
    carriedForwardLossesBeforeSale,
    carriedForwardLossesUsedAtSale: selected.lossesApplied,
    unusedLossesAtSale,
  };

  const totalInvestorCashContributed = cumulativeInvestorCash;
  const trueNetWealthCreated = netSaleProceeds + cumulativeCashflowReceived - totalInvestorCashContributed;
  const realWealthTodaysDollars = trueNetWealthCreated / Math.pow(1 + inflation, inputs.holdYears);
  const returnOnInvestorCapital = totalInvestorCashContributed > 0
    ? trueNetWealthCreated / totalInvestorCashContributed
    : 0;

  const irrSeries = [...cashflowSeries];
  irrSeries[irrSeries.length - 1] += netSaleProceeds;
  const investorIRR = calculateIRR(irrSeries);

  let opportunityCostValue: number | null = null;
  let opportunityCostDifference: number | null = null;
  if (inputs.opportunityCostEnabled) {
    const r = inputs.alternativeReturnRate / 100;
    let fv = initialCashContribution * Math.pow(1 + r, inputs.holdYears);
    years.forEach(y => {
      fv += y.investorCashContributed * Math.pow(1 + r, inputs.holdYears - y.year);
    });
    opportunityCostValue = fv - totalInvestorCashContributed;
    opportunityCostDifference = trueNetWealthCreated - opportunityCostValue;
  }

  return {
    rulesVersion: taxRules.version,
    isGrandfathered: grandfathered,
    effectiveCategory,
    initialCashContribution,
    years,
    sale,
    totalRentalIncome,
    totalOperatingExpenses,
    totalInterestPaid,
    totalPrincipalRepaid,
    totalDepreciationClaimed,
    totalTaxBenefits,
    totalCapitalImprovements,
    propertyValueAtSale: salePrice,
    loanBalanceAtSale: loanBalance,
    grossEquityAtSale: salePrice - loanBalance,
    totalInvestorCashContributed,
    cumulativeNetCashflowReceived: cumulativeCashflowReceived,
    netCashReceivedAfterSale: netSaleProceeds,
    trueNetWealthCreated,
    realWealthTodaysDollars,
    propertyGrowth: salePrice - inputs.purchasePrice,
    returnOnInvestorCapital,
    investorIRR,
    opportunityCostValue,
    opportunityCostDifference,
    cashflowSeries: irrSeries,
    marginalRates: investors.map(i => marginalRate(i.taxableIncome, i.includeMedicare)),
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency", currency: "AUD", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatPercent2(value: number): string {
  if (!isFinite(value)) return "n/a";
  return `${value.toFixed(2)}%`;
}
