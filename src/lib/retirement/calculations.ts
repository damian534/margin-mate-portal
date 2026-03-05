// Retirement Reverse Engineer calculations

export interface RetirementInputs {
  currentAge: number;
  retirementAge: number;
  desiredIncome: number;         // today's dollars, annual
  inflationRate: number;         // e.g. 3.0
  assetGrowthRate: number;       // e.g. 8.0
  withdrawalMode: 'withdrawal' | 'yield';
  withdrawalRate: number;        // e.g. 4.0
  // Property plan
  assetType: 'property' | 'shares' | 'mixed';
  propertyPrice: number;
  purchaseCostsPct: number;      // e.g. 5.0
  depositPct: number;            // e.g. 20
  loanType: 'pi' | 'io';
  loanTermYears: number;
  interestRate: number;          // e.g. 6.5
  rentalYield: number;           // e.g. 3.5
  expenseAllowancePct: number;   // e.g. 20
  rentGrowthRate: number;        // e.g. 3.0
  vacancyPct: number;            // e.g. 2.0
  haircut: number;               // e.g. 0
  // Toggles
  includeCashflow: boolean;
  includeSchedule: boolean;
  includeTax: boolean;
  includeDebtReduction: boolean;
  extraRepayment: number;
  // Schedule
  scheduleMode: 'all_now' | 'every_x_years';
  scheduleInterval: number;      // years between purchases
}

export interface RetirementResults {
  yearsToRetirement: number;
  incomeAtRetirement: number;        // inflated
  assetBaseRequired: number;         // at retirement
  assetBaseToday: number;            // PV equivalent
  propertiesNeeded: number;
  propertyValueAtRetirement: number;
  cashPerProperty: number;
  loanPerProperty: number;
  totalCashNeeded: number;
  monthlyRepayment: number;
  monthlyNetRent: number;
  monthlyCashflow: number;
  growthPath: { year: number; value: number }[];
  incomePath: { year: number; today: number; inflated: number }[];
  sensitivity: {
    label: string;
    incomeAtRetirement: number;
    assetBaseRequired: number;
    propertiesNeeded: number;
  }[];
  purchaseSchedule: { year: number; cumulativeProperties: number; cumulativeCash: number }[];
}

function pmt(rate: number, nper: number, pv: number): number {
  if (rate === 0) return pv / nper;
  const pvif = Math.pow(1 + rate, nper);
  return (rate * pv * pvif) / (pvif - 1);
}

export function calculateRetirement(i: RetirementInputs): RetirementResults {
  const n = Math.max(1, i.retirementAge - i.currentAge);
  const inf = i.inflationRate / 100;
  const g = i.assetGrowthRate / 100;
  const w = i.withdrawalRate / 100;

  // Step 1 — Inflate income
  const incomeAtRetirement = i.desiredIncome * Math.pow(1 + inf, n);

  // Step 2 — Required asset base
  const assetBaseRequired = w > 0 ? incomeAtRetirement / w : 0;

  // Step 3 — PV of asset base
  const assetBaseToday = g > 0 ? assetBaseRequired / Math.pow(1 + g, n) : assetBaseRequired;

  // Step 4 — Properties
  const propertyValueAtRetirement = i.propertyPrice * Math.pow(1 + g, n);
  const effectiveValue = propertyValueAtRetirement * (1 - i.haircut / 100);
  const propertiesNeeded = effectiveValue > 0 ? Math.ceil(assetBaseRequired / effectiveValue) : 0;

  // Step 5 — Capital per property
  const dep = i.depositPct / 100;
  const costs = i.purchaseCostsPct / 100;
  const cashPerProperty = i.propertyPrice * dep + i.propertyPrice * costs;
  const loanPerProperty = i.propertyPrice * (1 - dep);
  const totalCashNeeded = propertiesNeeded * cashPerProperty;

  // Step 6 — Repayments
  const rm = i.interestRate / 100 / 12;
  const m = i.loanTermYears * 12;
  const monthlyRepayment = i.loanType === 'io'
    ? loanPerProperty * rm
    : pmt(rm, m, loanPerProperty);

  // Step 7 — Cashflow
  const grossRentAnnual = i.propertyPrice * (i.rentalYield / 100);
  const netRentAnnual = grossRentAnnual * (1 - i.expenseAllowancePct / 100 - i.vacancyPct / 100);
  const monthlyNetRent = netRentAnnual / 12;
  const monthlyCashflow = monthlyNetRent - monthlyRepayment;

  // Growth path
  const growthPath = Array.from({ length: n + 1 }, (_, yr) => ({
    year: yr,
    value: assetBaseToday * Math.pow(1 + g, yr),
  }));

  // Income path
  const incomePath = Array.from({ length: n + 1 }, (_, yr) => ({
    year: yr,
    today: i.desiredIncome,
    inflated: i.desiredIncome * Math.pow(1 + inf, yr),
  }));

  // Sensitivity
  const scenarios = [
    { label: 'Conservative', growth: Math.max(0, i.assetGrowthRate - 2), inflation: i.inflationRate + 1, wr: Math.max(0.5, i.withdrawalRate - 0.5) },
    { label: 'Base Case', growth: i.assetGrowthRate, inflation: i.inflationRate, wr: i.withdrawalRate },
    { label: 'Optimistic', growth: i.assetGrowthRate + 2, inflation: Math.max(0, i.inflationRate - 1), wr: i.withdrawalRate + 0.5 },
  ];
  const sensitivity = scenarios.map(s => {
    const sInc = i.desiredIncome * Math.pow(1 + s.inflation / 100, n);
    const sAsset = s.wr > 0 ? sInc / (s.wr / 100) : 0;
    const sPropVal = i.propertyPrice * Math.pow(1 + s.growth / 100, n);
    const sEffective = sPropVal * (1 - i.haircut / 100);
    const sProps = sEffective > 0 ? Math.ceil(sAsset / sEffective) : 0;
    return { label: s.label, incomeAtRetirement: sInc, assetBaseRequired: sAsset, propertiesNeeded: sProps };
  });

  // Purchase schedule
  const purchaseSchedule: { year: number; cumulativeProperties: number; cumulativeCash: number }[] = [];
  if (i.includeSchedule && i.scheduleMode === 'every_x_years' && i.scheduleInterval > 0) {
    let bought = 0;
    for (let yr = 0; yr < n && bought < propertiesNeeded; yr += i.scheduleInterval) {
      bought++;
      purchaseSchedule.push({ year: yr, cumulativeProperties: bought, cumulativeCash: bought * cashPerProperty });
    }
    // If still need more, buy remaining at last opportunity
    if (bought < propertiesNeeded) {
      purchaseSchedule.push({ year: n - 1, cumulativeProperties: propertiesNeeded, cumulativeCash: propertiesNeeded * cashPerProperty });
    }
  } else {
    purchaseSchedule.push({ year: 0, cumulativeProperties: propertiesNeeded, cumulativeCash: totalCashNeeded });
  }

  return {
    yearsToRetirement: n,
    incomeAtRetirement,
    assetBaseRequired,
    assetBaseToday,
    propertiesNeeded,
    propertyValueAtRetirement,
    cashPerProperty,
    loanPerProperty,
    totalCashNeeded,
    monthlyRepayment,
    monthlyNetRent,
    monthlyCashflow,
    growthPath,
    incomePath,
    sensitivity,
    purchaseSchedule,
  };
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
