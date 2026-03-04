import { ScenarioInputs, Scenario } from './types';

const uid = () => crypto.randomUUID();

export const defaultInputs: ScenarioInputs = {
  name: 'New Scenario',
  project_name: '',
  location: '',
  purchase_price: 1000000,
  stamp_duty_rate: 0.065,
  stamp_duty_override: null,
  site_type: 'Land',
  demolition_cost: 0,
  other_acquisition_costs: 0,
  plans_to_planning: 0,
  planner: 0,
  other_consultants: 0,
  build_approval_est: 0,
  survey_titles: 0,
  unit_mix: [{ id: uid(), unit_type: '2 bed', count: 1, avg_sqm: 80 }],
  build_rate_per_sqm: 5000,
  include_gst_on_build: false,
  build_contingency_rate: 0.05,
  build_duration_months: 12,
  pre_build_months: 6,
  sales_settlement_month: 20,
  land_lvr: 0.80,
  land_interest_rate_annual: 0.075,
  land_repayment_type: 'IO',
  land_loan_term_months: null,
  land_drawdown_month: 1,
  land_fees: 0,
  lvr_applies_to: 'purchase_price',
  construction_lvr: 0.80,
  construction_interest_rate_annual: 0.085,
  construction_repayment_type: 'IO',
  construction_fees: 0,
  progress_curve_preset: 's_curve',
  progress_curve_custom: [],
  construction_lvr_base: 'build_cost',
  interest_funded: false,
  interest_funding_limit: null,
  sales_method: 'average',
  avg_sale_price: 500000,
  selling_cost_rate: 0.02,
  selling_cost_fixed: null,
  gst_model: 'none',
  company_tax_rate: 0.25,
  partners: [{ id: uid(), name: 'Partner 1', ownership_percent: 100, capital_contribution_percent: 100 }],
  profit_split_by_ownership: true,
  equity_by_contribution: true,
  soft_cost_spread: 'even',

  // Toggle 1: Council
  include_council_contributions: false,
  council_contributions_amount: 0,
  council_contributions_timing: 'upfront',
  council_contributions_custom_month: 1,

  // Toggle 2: Arch/Eng
  include_arch_eng_percent: false,
  arch_eng_percent_of_build: 0.06,
  arch_eng_timing: 'spread_prebuild',
  arch_eng_custom_schedule: [],

  // Toggle 3: QS/PM
  include_qs_pm_fees: false,
  qs_pm_method: 'percent_of_build',
  qs_pm_fixed_amount: 0,
  qs_pm_percent_of_build: 0.02,
  qs_pm_monthly_amount: 5000,
  qs_pm_start_month: 1,
  qs_pm_end_month: 20,
  qs_pm_timing: 'spread_build',

  // Toggle 4: Marketing
  include_marketing_staging: false,
  marketing_method: 'percent_of_revenue',
  marketing_fixed_amount: 0,
  marketing_percent_of_revenue: 0.01,
  marketing_timing: 'settlement',
  marketing_spread_months: 4,
  marketing_custom_month: 18,

  // Toggle 5: Debt Establishment Fees
  include_debt_establishment_fees: false,
  land_establishment_fee_percent: 0.01,
  construction_establishment_fee_percent: 0.01,
  debt_fee_payment_method: 'upfront',
  debt_fee_timing: 'split',

  // Toggle 6: Presales / Staged Settlement
  include_presales_staged_settlement: false,
  presales_start_month: 7,
  presales_schedule_method: 'staged_percent',
  staged_settlement_rows: [
    { id: uid(), stage_name: 'Final Settlement', stage_month: 20, stage_percent: 100 },
  ],
  unit_staging_rows: [],
  custom_revenue_rows: [],
  debt_repayment_strategy: 'final_settlement',
};

export const scenarioAInputs: ScenarioInputs = {
  ...defaultInputs,
  name: 'Scenario A: 15 Apartments',
  purchase_price: 1450000,
  stamp_duty_rate: 0.065,
  stamp_duty_override: null,
  demolition_cost: 18000,
  other_acquisition_costs: 0,
  plans_to_planning: 35000,
  planner: 15000,
  other_consultants: 50000,
  build_approval_est: 150000,
  survey_titles: 180000,
  unit_mix: [{ id: uid(), unit_type: '2 bed', count: 15, avg_sqm: 84 }],
  build_rate_per_sqm: 5000,
  build_contingency_rate: 0,
  avg_sale_price: 801666.67,
  selling_cost_rate: 0,
  selling_cost_fixed: null,
  company_tax_rate: 0.25,
};

export const scenarioBInputs: ScenarioInputs = {
  ...defaultInputs,
  name: 'Scenario B: 15 Apts + 5 Studios',
  purchase_price: 1450000,
  stamp_duty_rate: 0.065,
  stamp_duty_override: null,
  demolition_cost: 18000,
  other_acquisition_costs: 0,
  plans_to_planning: 35000,
  planner: 15000,
  other_consultants: 50000,
  build_approval_est: 150000,
  survey_titles: 300000,
  unit_mix: [
    { id: uid(), unit_type: '2 bed', count: 15, avg_sqm: 84 },
    { id: uid(), unit_type: 'Studio', count: 5, avg_sqm: 50 },
  ],
  build_rate_per_sqm: 5000,
  build_contingency_rate: 0,
  avg_sale_price: 738750,
  selling_cost_rate: 0,
  selling_cost_fixed: null,
  company_tax_rate: 0.25,
};

export function createScenario(inputs: ScenarioInputs): Scenario {
  return { id: uid(), inputs, outputs: null };
}
