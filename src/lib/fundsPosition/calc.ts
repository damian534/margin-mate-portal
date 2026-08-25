import { stateCalcs } from '@/lib/stampDutyRates';
import { calculateGovFees, type GovFeeState } from '@/lib/govFees';
import { estimateLmi, lmiStampDuty } from './lmi';
import { quoteLmi } from './lmiProviders';
import type { FundsPositionInputs, FundsPositionResult } from './types';

const num = (n: number) => (isFinite(n) && !isNaN(n) ? n : 0);

export function sumFundsBreakdown(i: FundsPositionInputs): number {
  return (
    num(i.deposit) +
    num(i.savings) +
    num(i.gifts) +
    num(i.assetsDisposed) +
    num(i.equity) +
    i.customFunds.reduce((s, f) => s + num(f.amount), 0)
  );
}

export function sumFees(i: FundsPositionInputs): number {
  return i.feesDetailed
    ? i.feeItems.reduce((s, f) => s + num(f.amount), 0)
    : num(i.feesTotal);
}

function repaymentFor(loan: number, ratePct: number, termYears: number, ioYears: number, io: boolean): number {
  const r = ratePct / 100 / 12;
  if (loan <= 0) return 0;
  if (io || ioYears > 0) {
    // during the interest only period
    if (io || ioYears > 0) return loan * r;
  }
  const n = termYears * 12;
  if (r === 0) return loan / n;
  return (loan * r) / (1 - Math.pow(1 + r, -n));
}

/**
 * Solves the funding position. Any field flagged `auto` is derived from the
 * fields that are switched on (manual). The engine iterates so LMI, which
 * depends on the loan, and the loan, which can depend on total costs, settle.
 */
export function calculateFundsPosition(i: FundsPositionInputs): FundsPositionResult {
  const isPurchase = i.transactionType === 'purchase' || i.transactionType === 'property_only';
  const dutyBaseIsProperty = i.transactionType !== 'refinance';

  const manualFunds = i.fundsDetailed ? sumFundsBreakdown(i) : num(i.fundsAvailable.value);
  const fees = sumFees(i);

  let propertyValue = num(i.propertyValue.value);
  let baseLVR = num(i.baseLVR.value);
  let baseLoan = num(i.baseLoan.value);
  let fundsAvailable = manualFunds;

  let lmi = 0;
  let lmiDuty = 0;
  let lmiRatePct = 0;
  let lmiWaived = false;
  let lmiEligible = true;
  let lmiNote: string | null = null;
  let stampDuty = 0;
  let concession = 0;
  let transferFee = 0;
  let mortgageRegistrationFee = 0;
  let govCharges = 0;
  let totalCosts = 0;
  let fundsRequired = 0;

  for (let pass = 0; pass < 4; pass++) {
    // --- resolve the value / LVR / loan trio -------------------------------
    if (!i.baseLoan.auto) {
      baseLoan = num(i.baseLoan.value);
      if (i.propertyValue.auto && !i.baseLVR.auto && baseLVR > 0) {
        propertyValue = baseLoan / (baseLVR / 100);
      } else {
        propertyValue = num(i.propertyValue.value);
        baseLVR = propertyValue > 0 ? (baseLoan / propertyValue) * 100 : 0;
      }
    } else if (!i.baseLVR.auto) {
      propertyValue = num(i.propertyValue.value);
      baseLVR = num(i.baseLVR.value);
      baseLoan = propertyValue * (baseLVR / 100);
    } else {
      // both loan and LVR auto -> back-solve the loan from funds available
      propertyValue = num(i.propertyValue.value);
      baseLoan = Math.max(0, fundsRequired - fundsAvailable);
      baseLVR = propertyValue > 0 ? (baseLoan / propertyValue) * 100 : 0;
    }

    // --- LMI ---------------------------------------------------------------
    lmiRatePct = 0;
    lmiWaived = false;
    lmiEligible = true;
    lmiNote = null;
    if (i.fhgScheme || baseLVR <= 80) {
      lmi = 0;
      lmiWaived = i.fhgScheme && baseLVR > 80;
      if (lmiWaived) lmiNote = 'Covered by the Home Guarantee Scheme';
    } else if (!i.lmiOverride.auto) {
      lmi = num(i.lmiOverride.value);
      lmiRatePct = baseLoan > 0 ? (lmi / baseLoan) * 100 : 0;
      lmiNote = 'Manual override';
    } else if (i.lenderLmi) {
      const q = quoteLmi(i.lenderLmi, baseLoan, baseLVR, i.purpose === 'investment');
      lmi = q.premium;
      lmiRatePct = q.ratePct;
      lmiWaived = q.waived;
      lmiEligible = q.eligible;
      lmiNote = q.note;
    } else {
      lmi = estimateLmi(baseLoan, baseLVR, i.purpose === 'investment');
      lmiRatePct = baseLoan > 0 ? (lmi / baseLoan) * 100 : 0;
    }
    lmiDuty = lmi > 0 && i.includeLmiStampDuty ? lmiStampDuty(lmi, i.state) : 0;
    const lmiTotal = lmi + lmiDuty;

    // --- government charges -------------------------------------------------
    const dutyBase = i.differentValuation ? Math.max(propertyValue, num(i.valuation)) : propertyValue;
    if (dutyBaseIsProperty && isPurchase) {
      const res = stateCalcs[i.state](dutyBase, i.firstHomeBuyer);
      stampDuty = res.duty;
      concession = res.concession;
      if (i.foreignBuyer) stampDuty += dutyBase * 0.08; // foreign purchaser additional duty
    } else {
      stampDuty = 0;
      concession = 0;
    }
    const gf = calculateGovFees(propertyValue, i.state as GovFeeState, baseLoan > 0);
    transferFee = isPurchase ? gf.transferFee : 0;
    mortgageRegistrationFee = baseLoan > 0 ? gf.mortgageRegistrationFee : 0;

    const calcGov = Math.max(0, stampDuty - concession) + transferFee + mortgageRegistrationFee;
    govCharges = i.govTotalOverride.auto ? calcGov : num(i.govTotalOverride.value);

    // --- totals -------------------------------------------------------------
    const lmiPayable = i.capitaliseLMI ? 0 : lmiTotal;
    totalCosts = govCharges + fees + lmiPayable;
    fundsRequired = (isPurchase ? propertyValue : 0) + totalCosts;

    if (i.fundsAvailable.auto && !i.fundsDetailed) {
      fundsAvailable = Math.max(0, fundsRequired - baseLoan);
    } else {
      fundsAvailable = manualFunds;
    }
  }

  const lmiTotal = lmi + lmiDuty;
  const lmiCapitalised = i.capitaliseLMI ? lmiTotal : 0;
  const totalLoan = baseLoan + lmiCapitalised;
  const totalLVR = propertyValue > 0 ? (totalLoan / propertyValue) * 100 : 0;
  const netSurplus = fundsAvailable + baseLoan - fundsRequired;

  return {
    propertyValue,
    baseLVR,
    baseLoan,
    totalLoan,
    totalLVR,
    lmi,
    lmiRatePct,
    lmiWaived,
    lmiEligible,
    lmiNote,
    lmiStampDuty: lmiDuty,
    lmiCapitalised,
    lmiPayable: i.capitaliseLMI ? 0 : lmiTotal,
    stampDuty,
    stampDutyConcession: concession,
    transferFee,
    mortgageRegistrationFee,
    govCharges,
    fees,
    totalCosts,
    fundsRequired,
    fundsAvailable,
    netSurplus,
    repayment: repaymentFor(
      totalLoan,
      i.rate,
      i.termYears,
      i.ioYears,
      i.repaymentType === 'io',
    ),
  };
}

export const defaultFundsInputs = (): FundsPositionInputs => ({
  state: 'VIC',
  propertyType: 'established',
  purpose: 'owner_occupied',
  transactionType: 'purchase',
  firstHomeBuyer: false,
  pensioner: false,
  fhgScheme: false,
  selfEmployed: false,
  foreignBuyer: false,
  differentValuation: false,
  valuation: 0,
  propertyValue: { value: 950000, auto: false },
  baseLVR: { value: 90, auto: true },
  baseLoan: { value: 855000, auto: false },
  fundsAvailable: { value: 115000, auto: false },
  rate: 6.5,
  termYears: 30,
  ioYears: 0,
  repaymentType: 'pi',
  lenderId: null,
  lenderName: null,
  lenderLmi: null,
  capitaliseLMI: true,
  lmiOverride: { value: 0, auto: true },
  includeLmiStampDuty: true,
  fundsDetailed: false,
  deposit: 0,
  savings: 0,
  gifts: 0,
  assetsDisposed: 0,
  equity: 0,
  customFunds: [],
  feesDetailed: false,
  feesTotal: 3000,
  feeItems: [],
  govDetailed: true,
  govTotalOverride: { value: 0, auto: true },
});
