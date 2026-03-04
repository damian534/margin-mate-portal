export interface UnitMixRow {
  id: string;
  unit_type: string;
  count: number;
  avg_sqm: number;
  sale_price_each?: number;
}

export interface Partner {
  id: string;
  name: string;
  ownership_percent: number;
  capital_contribution_percent: number;
}

export type RepaymentType = 'IO' | 'PI' | 'Capitalised';
export type ProgressCurvePreset = 'even' | 'front_loaded' | 'back_loaded' | 's_curve' | 'custom';
export type SalesMethod = 'average' | 'unit_level';
export type GSTModel = 'none' | 'simple';
export type SiteType = 'Land' | 'House' | 'Other';
export type LVRAppliesTo = 'purchase_price' | 'total_site_cost';
export type ConstructionLVRBase = 'build_cost' | 'total_dev_cost' | 'grv';
export type SoftCostSpread = 'upfront' | 'even' | 'custom';

// Toggle timing types
export type CouncilTiming = 'upfront' | 'spread_prebuild' | 'build_start' | 'settlement' | 'custom_month';
export type ArchEngTiming = 'spread_prebuild' | 'spread_build' | 'custom';
export type QsPmMethod = 'fixed' | 'percent_of_build' | 'monthly_retainer';
export type QsPmTiming = 'spread_build' | 'upfront' | 'even';
export type MarketingMethod = 'fixed' | 'percent_of_revenue';
export type MarketingTiming = 'settlement' | 'presales_launch' | 'spread_last_x' | 'custom_month';
export type DebtFeePayment = 'upfront' | 'capitalised';
export type DebtFeeTiming = 'month_1' | 'construction_start' | 'split';
export type PresalesMethod = 'staged_percent' | 'unit_level' | 'custom_cashflow';
export type DebtRepaymentStrategy = 'final_settlement' | 'waterfall';

export interface StagedSettlementRow {
  id: string;
  stage_name: string;
  stage_month: number;
  stage_percent: number; // 0-100
}

export interface UnitStagingRow {
  id: string;
  unit_type: string;
  count: number;
  sale_price_each: number;
  settlement_month: number;
}

export interface CustomRevenueRow {
  month: number;
  amount: number;
}

export interface ScenarioInputs {
  name: string;
  project_name: string;
  location: string;

  // Site & Acquisition
  purchase_price: number;
  stamp_duty_rate: number;
  stamp_duty_override: number | null;
  site_type: SiteType;
  demolition_cost: number;
  other_acquisition_costs: number;

  // Approvals & Consultants
  plans_to_planning: number;
  planner: number;
  other_consultants: number;
  build_approval_est: number;
  survey_titles: number;

  // Construction
  unit_mix: UnitMixRow[];
  build_rate_per_sqm: number;
  include_gst_on_build: boolean;
  build_contingency_rate: number;
  build_duration_months: number;
  pre_build_months: number;
  sales_settlement_month: number;

  // Finance - Land
  land_lvr: number;
  land_interest_rate_annual: number;
  land_repayment_type: RepaymentType;
  land_loan_term_months: number | null;
  land_drawdown_month: number;
  land_fees: number;
  lvr_applies_to: LVRAppliesTo;

  // Finance - Construction
  construction_lvr: number;
  construction_interest_rate_annual: number;
  construction_repayment_type: RepaymentType;
  construction_fees: number;
  progress_curve_preset: ProgressCurvePreset;
  progress_curve_custom: number[];
  construction_lvr_base: ConstructionLVRBase;

  // Interest funding
  interest_funded: boolean;
  interest_funding_limit: number | null;

  // Sales & Tax
  sales_method: SalesMethod;
  avg_sale_price: number;
  selling_cost_rate: number;
  selling_cost_fixed: number | null;
  gst_model: GSTModel;
  company_tax_rate: number;

  // Partners
  partners: Partner[];
  profit_split_by_ownership: boolean;
  equity_by_contribution: boolean;

  // Soft cost spread
  soft_cost_spread: SoftCostSpread;

  // ── Toggle 1: Council Contributions ──
  include_council_contributions: boolean;
  council_contributions_amount: number;
  council_contributions_timing: CouncilTiming;
  council_contributions_custom_month: number;

  // ── Toggle 2: Architect / Engineering % of Build ──
  include_arch_eng_percent: boolean;
  arch_eng_percent_of_build: number;
  arch_eng_timing: ArchEngTiming;
  arch_eng_custom_schedule: number[]; // per-month % that must sum to 100

  // ── Toggle 3: QS / PM Fees ──
  include_qs_pm_fees: boolean;
  qs_pm_method: QsPmMethod;
  qs_pm_fixed_amount: number;
  qs_pm_percent_of_build: number;
  qs_pm_monthly_amount: number;
  qs_pm_start_month: number;
  qs_pm_end_month: number;
  qs_pm_timing: QsPmTiming;

  // ── Toggle 4: Marketing & Staging ──
  include_marketing_staging: boolean;
  marketing_method: MarketingMethod;
  marketing_fixed_amount: number;
  marketing_percent_of_revenue: number;
  marketing_timing: MarketingTiming;
  marketing_spread_months: number;
  marketing_custom_month: number;

  // ── Toggle 5: Debt Establishment Fees ──
  include_debt_establishment_fees: boolean;
  land_establishment_fee_percent: number;
  construction_establishment_fee_percent: number;
  debt_fee_payment_method: DebtFeePayment;
  debt_fee_timing: DebtFeeTiming;

  // ── Toggle 6: Presales / Staged Settlement ──
  include_presales_staged_settlement: boolean;
  presales_start_month: number;
  presales_schedule_method: PresalesMethod;
  staged_settlement_rows: StagedSettlementRow[];
  unit_staging_rows: UnitStagingRow[];
  custom_revenue_rows: CustomRevenueRow[];
  debt_repayment_strategy: DebtRepaymentStrategy;
}

export interface MonthRow {
  month: number;
  phase: 'pre_build' | 'build' | 'post_build' | 'settlement';
  // Outflows
  site_costs: number;
  soft_costs: number;
  build_costs: number;
  selling_costs: number;
  optional_costs: number;
  // Debt
  land_draw: number;
  land_balance: number;
  land_interest: number;
  construction_draw: number;
  construction_balance: number;
  construction_interest: number;
  total_interest: number;
  // Cashflow
  interest_payable: number;
  equity_injection: number;
  net_cashflow: number;
  cumulative_cashflow: number;
  // Inflows
  revenue: number;
  // Debt repayment
  debt_repayment: number;
  total_debt: number;
}

export interface ScenarioOutputs {
  // Calculated intermediates
  stamp_duty: number;
  site_total: number;
  soft_costs_total: number;
  total_sqm: number;
  total_units: number;
  base_build_cost: number;
  build_contingency: number;
  gross_build_cost: number;
  gross_revenue: number;
  selling_costs: number;

  // Optional cost buckets
  council_contributions: number;
  arch_eng_fees: number;
  qs_pm_fees: number;
  marketing_staging: number;
  debt_establishment_fees: number;
  optional_costs_total: number;

  // Key outputs
  total_dev_cost_ex_interest: number;
  total_interest_land: number;
  total_interest_construction: number;
  total_interest: number;
  total_dev_cost_inc_interest: number;
  gross_profit: number;
  tax: number;
  net_profit_after_tax: number;
  total_equity_required: number;
  peak_debt: number;
  peak_monthly_cashflow: number;
  equity_multiple: number;

  // Per-unit
  cost_per_unit: number;
  revenue_per_unit: number;
  profit_per_unit: number;

  // Partner outputs
  partner_results: {
    name: string;
    ownership_percent: number;
    equity_contribution: number;
    profit_distribution: number;
    return_on_equity: number;
  }[];

  // Month-by-month
  monthly: MonthRow[];

  // Progress curve used
  progress_curve: number[];
}

export interface Scenario {
  id: string;
  inputs: ScenarioInputs;
  outputs: ScenarioOutputs | null;
}
