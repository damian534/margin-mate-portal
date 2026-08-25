import type { StateKey } from '@/lib/stampDutyRates';
import type { LenderLmiProfile } from './lmiProviders';

/** A value that can either be typed in (manual) or derived by the engine (auto). */
export interface AutoValue {
  auto: boolean;
  value: number;
}

export const av = (value: number, auto = false): AutoValue => ({ value, auto });

export type PropertyType = 'established' | 'new' | 'vacant_build' | 'vacant_no_build';
export type Purpose = 'owner_occupied' | 'investment';
export type TransactionType = 'purchase' | 'refinance' | 'sale' | 'property_only';
export type RepaymentType = 'pi' | 'io';

export interface LineItem {
  id: string;
  label: string;
  amount: number;
}

export interface FundsPositionInputs {
  state: StateKey;
  propertyType: PropertyType;
  purpose: Purpose;
  transactionType: TransactionType;

  // Borrower circumstances
  firstHomeBuyer: boolean;
  pensioner: boolean;
  fhgScheme: boolean;
  selfEmployed: boolean;
  foreignBuyer: boolean;
  differentValuation: boolean;
  valuation: number;

  // Core solvable figures
  propertyValue: AutoValue;
  baseLVR: AutoValue; // percentage, e.g. 94.95
  baseLoan: AutoValue;
  fundsAvailable: AutoValue;

  // Loan terms
  rate: number;
  termYears: number;
  ioYears: number;
  repaymentType: RepaymentType;

  // LMI
  /** selected lender (drives LMI pricing) */
  lenderId?: string | null;
  lenderName?: string | null;
  lenderLmi?: LenderLmiProfile | null;
  capitaliseLMI: boolean;
  lmiOverride: AutoValue; // auto=true -> calculated
  includeLmiStampDuty: boolean;

  // Funds available breakdown
  fundsDetailed: boolean;
  deposit: number;
  savings: number;
  gifts: number;
  assetsDisposed: number;
  equity: number;
  customFunds: LineItem[];

  // Fees
  feesDetailed: boolean;
  feesTotal: number;
  feeItems: LineItem[];

  // Government charges
  govDetailed: boolean;
  govTotalOverride: AutoValue;
}

export interface FundsPositionResult {
  propertyValue: number;
  baseLVR: number;
  baseLoan: number;
  totalLoan: number;
  totalLVR: number;
  lmi: number;
  lmiRatePct: number;
  lmiWaived: boolean;
  lmiEligible: boolean;
  lmiNote: string | null;
  lmiStampDuty: number;
  lmiCapitalised: number;
  lmiPayable: number;
  stampDuty: number;
  stampDutyConcession: number;
  transferFee: number;
  mortgageRegistrationFee: number;
  govCharges: number;
  fees: number;
  totalCosts: number;
  fundsRequired: number;
  fundsAvailable: number;
  netSurplus: number;
  repayment: number;
}
