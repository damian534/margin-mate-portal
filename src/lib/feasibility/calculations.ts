import { ScenarioInputs, ScenarioOutputs, MonthRow } from './types';

function generateProgressCurve(preset: string, months: number, custom: number[]): number[] {
  if (preset === 'custom' && custom.length === months) return custom;
  const curve: number[] = [];
  for (let i = 0; i < months; i++) {
    let v: number;
    switch (preset) {
      case 'even':
        v = 1 / months;
        break;
      case 'front_loaded':
        v = (months - i);
        break;
      case 'back_loaded':
        v = (i + 1);
        break;
      case 's_curve':
      default: {
        // S-curve using logistic
        const x = (i / (months - 1 || 1)) * 6 - 3;
        v = 1 / (1 + Math.exp(-x));
        break;
      }
    }
    curve.push(v);
  }
  // Normalise to sum=1
  const sum = curve.reduce((a, b) => a + b, 0);
  return curve.map(v => v / sum);
}

export function calculateScenario(inputs: ScenarioInputs): ScenarioOutputs {
  const {
    purchase_price, stamp_duty_rate, stamp_duty_override, demolition_cost,
    other_acquisition_costs, plans_to_planning, planner, other_consultants,
    build_approval_est, survey_titles, unit_mix, build_rate_per_sqm,
    build_contingency_rate, build_duration_months, pre_build_months,
    sales_settlement_month: rawSettlement, land_lvr, land_interest_rate_annual,
    land_repayment_type, land_fees, lvr_applies_to, construction_lvr,
    construction_interest_rate_annual, construction_repayment_type,
    construction_fees, progress_curve_preset, progress_curve_custom,
    interest_funded, interest_funding_limit, sales_method, avg_sale_price,
    selling_cost_rate, selling_cost_fixed, company_tax_rate, partners,
    soft_cost_spread,
  } = inputs;

  // Ensure settlement >= pre+build
  const minSettlement = pre_build_months + build_duration_months + 1;
  const sales_settlement_month = Math.max(rawSettlement, minSettlement);

  // Site
  const stamp_duty = stamp_duty_override ?? purchase_price * stamp_duty_rate;
  const site_total = purchase_price + stamp_duty + demolition_cost + other_acquisition_costs;

  // Soft costs
  const soft_costs_total = plans_to_planning + planner + other_consultants + build_approval_est + survey_titles;

  // Construction
  const total_units = unit_mix.reduce((s, r) => s + r.count, 0);
  const total_sqm = unit_mix.reduce((s, r) => s + r.count * r.avg_sqm, 0);
  const base_build_cost = total_sqm * build_rate_per_sqm;
  const build_contingency = base_build_cost * build_contingency_rate;
  const gross_build_cost = base_build_cost + build_contingency;

  // Revenue
  let gross_revenue: number;
  if (sales_method === 'unit_level') {
    gross_revenue = unit_mix.reduce((s, r) => s + r.count * (r.sale_price_each ?? 0), 0);
  } else {
    gross_revenue = total_units * avg_sale_price;
  }

  const selling_costs = selling_cost_fixed ?? gross_revenue * selling_cost_rate;

  // Finance setup
  const land_lvr_base = lvr_applies_to === 'total_site_cost' ? site_total : purchase_price;
  const land_loan_amount = land_lvr_base * land_lvr;

  // Progress curve
  const progress_curve = generateProgressCurve(progress_curve_preset, build_duration_months, progress_curve_custom);

  // Soft cost schedule
  const softCostSchedule = new Array(sales_settlement_month).fill(0);
  if (soft_cost_spread === 'upfront') {
    softCostSchedule[0] = soft_costs_total;
  } else {
    // even across pre-build
    const spread = Math.max(pre_build_months, 1);
    const per = soft_costs_total / spread;
    for (let i = 0; i < spread; i++) softCostSchedule[i] = per;
  }

  // Month-by-month
  const monthly: MonthRow[] = [];
  let land_balance = 0;
  let construction_balance = 0;
  let cumulative_cashflow = 0;
  let total_interest_land = 0;
  let total_interest_construction = 0;
  let peak_debt = 0;
  let peak_monthly_cashflow = 0;
  let total_equity_required = 0;
  let interest_funded_balance = 0;

  const land_r = land_interest_rate_annual / 12;
  const constr_r = construction_interest_rate_annual / 12;

  for (let m = 1; m <= sales_settlement_month; m++) {
    const idx = m - 1;
    const isSettlement = m === sales_settlement_month;
    let phase: MonthRow['phase'] = 'pre_build';
    if (isSettlement) phase = 'settlement';
    else if (m > pre_build_months + build_duration_months) phase = 'post_build';
    else if (m > pre_build_months) phase = 'build';

    // Site costs at month 1
    const site_costs = m === 1 ? site_total : 0;
    const soft_costs_m = softCostSchedule[idx] ?? 0;

    // Build costs
    let build_costs = 0;
    if (phase === 'build') {
      const buildMonthIdx = m - pre_build_months - 1;
      build_costs = gross_build_cost * (progress_curve[buildMonthIdx] ?? 0);
    }

    const selling_costs_m = isSettlement ? selling_costs : 0;

    // Land draw at month 1
    const land_draw = m === 1 ? land_loan_amount : 0;
    land_balance += land_draw;

    // Construction draw
    let construction_draw = 0;
    if (phase === 'build') {
      const buildMonthIdx = m - pre_build_months - 1;
      const requested = gross_build_cost * (progress_curve[buildMonthIdx] ?? 0) * construction_lvr;
      construction_draw = requested;
    }
    construction_balance += construction_draw;

    // Interest
    const land_interest = land_balance * land_r;
    const construction_interest = construction_balance * constr_r;
    const total_interest_m = land_interest + construction_interest;

    // Interest handling
    let interest_payable = 0;
    if (interest_funded) {
      // Add to balance (capitalise)
      const cap = interest_funding_limit != null
        ? Math.min(total_interest_m, Math.max(0, interest_funding_limit - interest_funded_balance))
        : total_interest_m;
      interest_funded_balance += cap;
      construction_balance += cap;
      interest_payable = total_interest_m - cap;
    } else if (land_repayment_type === 'Capitalised' && construction_repayment_type === 'Capitalised') {
      land_balance += land_interest;
      construction_balance += construction_interest;
    } else {
      interest_payable = total_interest_m;
    }

    total_interest_land += land_interest;
    total_interest_construction += construction_interest;

    // Equity needed this month: costs not covered by debt
    const total_cost_m = site_costs + soft_costs_m + build_costs + selling_costs_m;
    const total_debt_draw = land_draw + construction_draw;
    const equity_injection = Math.max(0, total_cost_m - total_debt_draw) + interest_payable +
      (m === 1 ? land_fees + construction_fees : 0);
    total_equity_required += equity_injection;

    // Revenue at settlement
    const revenue = isSettlement ? gross_revenue : 0;
    const total_debt = land_balance + construction_balance;
    const debt_repayment = isSettlement ? total_debt : 0;

    if (isSettlement) {
      land_balance = 0;
      construction_balance = 0;
    }

    const net_cashflow = revenue - debt_repayment - equity_injection;
    cumulative_cashflow += equity_injection;
    peak_debt = Math.max(peak_debt, total_debt);
    peak_monthly_cashflow = Math.max(peak_monthly_cashflow, equity_injection);

    monthly.push({
      month: m,
      phase,
      site_costs,
      soft_costs: soft_costs_m,
      build_costs,
      selling_costs: selling_costs_m,
      land_draw,
      land_balance,
      land_interest,
      construction_draw,
      construction_balance,
      construction_interest,
      total_interest: total_interest_m,
      interest_payable,
      equity_injection,
      net_cashflow,
      cumulative_cashflow,
      revenue,
      debt_repayment,
      total_debt,
    });
  }

  const total_interest = total_interest_land + total_interest_construction;
  const total_dev_cost_ex_interest = site_total + soft_costs_total + gross_build_cost + land_fees + construction_fees + selling_costs;
  const total_dev_cost_inc_interest = total_dev_cost_ex_interest + total_interest;
  const gross_profit = gross_revenue - total_dev_cost_inc_interest;
  const tax = Math.max(0, gross_profit * company_tax_rate);
  const net_profit_after_tax = gross_profit - tax;
  const equity_multiple = total_equity_required > 0 ? net_profit_after_tax / total_equity_required : 0;

  // Partner results
  const partner_results = partners.map(p => {
    const eq = total_equity_required * (p.capital_contribution_percent / 100);
    const profit = net_profit_after_tax * (p.ownership_percent / 100);
    return {
      name: p.name,
      ownership_percent: p.ownership_percent,
      equity_contribution: eq,
      profit_distribution: profit,
      return_on_equity: eq > 0 ? profit / eq : 0,
    };
  });

  return {
    stamp_duty,
    site_total,
    soft_costs_total,
    total_sqm,
    total_units,
    base_build_cost,
    build_contingency,
    gross_build_cost,
    gross_revenue,
    selling_costs,
    total_dev_cost_ex_interest,
    total_interest_land,
    total_interest_construction,
    total_interest,
    total_dev_cost_inc_interest,
    gross_profit,
    tax,
    net_profit_after_tax,
    total_equity_required,
    peak_debt,
    peak_monthly_cashflow,
    equity_multiple,
    cost_per_unit: total_units > 0 ? total_dev_cost_inc_interest / total_units : 0,
    revenue_per_unit: total_units > 0 ? gross_revenue / total_units : 0,
    profit_per_unit: total_units > 0 ? net_profit_after_tax / total_units : 0,
    partner_results,
    monthly,
    progress_curve,
  };
}
