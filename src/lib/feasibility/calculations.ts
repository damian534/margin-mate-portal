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
        const x = (i / (months - 1 || 1)) * 6 - 3;
        v = 1 / (1 + Math.exp(-x));
        break;
      }
    }
    curve.push(v);
  }
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

  // ── Optional cost buckets ──
  const council_contributions = inputs.include_council_contributions ? inputs.council_contributions_amount : 0;

  const arch_eng_fees = inputs.include_arch_eng_percent
    ? gross_build_cost * inputs.arch_eng_percent_of_build : 0;

  let qs_pm_fees = 0;
  if (inputs.include_qs_pm_fees) {
    switch (inputs.qs_pm_method) {
      case 'fixed': qs_pm_fees = inputs.qs_pm_fixed_amount; break;
      case 'percent_of_build': qs_pm_fees = gross_build_cost * inputs.qs_pm_percent_of_build; break;
      case 'monthly_retainer': {
        const months = Math.max(0, inputs.qs_pm_end_month - inputs.qs_pm_start_month + 1);
        qs_pm_fees = inputs.qs_pm_monthly_amount * months;
        break;
      }
    }
  }

  let marketing_staging = 0;
  if (inputs.include_marketing_staging) {
    marketing_staging = inputs.marketing_method === 'fixed'
      ? inputs.marketing_fixed_amount
      : gross_revenue * inputs.marketing_percent_of_revenue;
  }

  // Debt establishment fees
  const land_lvr_base = lvr_applies_to === 'total_site_cost' ? site_total : purchase_price;
  const land_loan_amount = land_lvr_base * land_lvr;
  const construction_loan_limit = gross_build_cost * construction_lvr;

  let land_est_fee = 0;
  let construction_est_fee = 0;
  if (inputs.include_debt_establishment_fees) {
    land_est_fee = land_loan_amount * inputs.land_establishment_fee_percent;
    construction_est_fee = construction_loan_limit * inputs.construction_establishment_fee_percent;
  }
  const debt_establishment_fees = land_est_fee + construction_est_fee;

  const optional_costs_total = council_contributions + arch_eng_fees + qs_pm_fees + marketing_staging + debt_establishment_fees;

  // Progress curve
  const progress_curve = generateProgressCurve(progress_curve_preset, build_duration_months, progress_curve_custom);

  // ── Build per-month schedules for optional costs ──
  const optSchedule = new Array(sales_settlement_month).fill(0);

  // Council contributions
  if (inputs.include_council_contributions && council_contributions > 0) {
    switch (inputs.council_contributions_timing) {
      case 'upfront': optSchedule[0] += council_contributions; break;
      case 'spread_prebuild': {
        const n = Math.max(pre_build_months, 1);
        for (let i = 0; i < n; i++) optSchedule[i] += council_contributions / n;
        break;
      }
      case 'build_start': optSchedule[pre_build_months] = (optSchedule[pre_build_months] ?? 0) + council_contributions; break;
      case 'settlement': optSchedule[sales_settlement_month - 1] += council_contributions; break;
      case 'custom_month': {
        const cm = Math.min(Math.max(inputs.council_contributions_custom_month, 1), sales_settlement_month) - 1;
        optSchedule[cm] += council_contributions;
        break;
      }
    }
  }

  // Arch/Eng
  if (inputs.include_arch_eng_percent && arch_eng_fees > 0) {
    switch (inputs.arch_eng_timing) {
      case 'spread_prebuild': {
        const n = Math.max(pre_build_months, 1);
        for (let i = 0; i < n; i++) optSchedule[i] += arch_eng_fees / n;
        break;
      }
      case 'spread_build': {
        for (let i = 0; i < build_duration_months; i++) {
          optSchedule[pre_build_months + i] += arch_eng_fees / build_duration_months;
        }
        break;
      }
      case 'custom': {
        const sched = inputs.arch_eng_custom_schedule;
        if (sched.length > 0) {
          const total = sched.reduce((a, b) => a + b, 0) || 1;
          sched.forEach((pct, i) => {
            if (i < sales_settlement_month) optSchedule[i] += arch_eng_fees * (pct / total);
          });
        } else {
          optSchedule[0] += arch_eng_fees;
        }
        break;
      }
    }
  }

  // QS/PM
  if (inputs.include_qs_pm_fees && qs_pm_fees > 0) {
    if (inputs.qs_pm_method === 'monthly_retainer') {
      const start = Math.max(inputs.qs_pm_start_month, 1) - 1;
      const end = Math.min(inputs.qs_pm_end_month, sales_settlement_month) - 1;
      for (let i = start; i <= end; i++) optSchedule[i] += inputs.qs_pm_monthly_amount;
    } else {
      // fixed or % — use timing
      switch (inputs.qs_pm_timing) {
        case 'upfront': optSchedule[0] += qs_pm_fees; break;
        case 'spread_build': {
          for (let i = 0; i < build_duration_months; i++) {
            optSchedule[pre_build_months + i] += qs_pm_fees / build_duration_months;
          }
          break;
        }
        case 'even': {
          for (let i = 0; i < sales_settlement_month; i++) optSchedule[i] += qs_pm_fees / sales_settlement_month;
          break;
        }
      }
    }
  }

  // Marketing
  if (inputs.include_marketing_staging && marketing_staging > 0) {
    switch (inputs.marketing_timing) {
      case 'settlement': optSchedule[sales_settlement_month - 1] += marketing_staging; break;
      case 'presales_launch': {
        const pm = Math.min(Math.max(inputs.presales_start_month, 1), sales_settlement_month) - 1;
        optSchedule[pm] += marketing_staging;
        break;
      }
      case 'spread_last_x': {
        const n = Math.min(inputs.marketing_spread_months, sales_settlement_month);
        const start = sales_settlement_month - n;
        for (let i = start; i < sales_settlement_month; i++) optSchedule[i] += marketing_staging / n;
        break;
      }
      case 'custom_month': {
        const cm = Math.min(Math.max(inputs.marketing_custom_month, 1), sales_settlement_month) - 1;
        optSchedule[cm] += marketing_staging;
        break;
      }
    }
  }

  // Debt establishment fees schedule
  const debtFeeSchedule = new Array(sales_settlement_month).fill(0);
  if (inputs.include_debt_establishment_fees && debt_establishment_fees > 0) {
    const isCap = inputs.debt_fee_payment_method === 'capitalised';
    if (!isCap) {
      // Paid as cash outflow
      switch (inputs.debt_fee_timing) {
        case 'month_1': debtFeeSchedule[0] += debt_establishment_fees; break;
        case 'construction_start': debtFeeSchedule[pre_build_months] += debt_establishment_fees; break;
        case 'split':
          debtFeeSchedule[0] += land_est_fee;
          debtFeeSchedule[pre_build_months] += construction_est_fee;
          break;
      }
    }
    // If capitalised, handled in the debt loop below
  }

  // Soft cost schedule
  const softCostSchedule = new Array(sales_settlement_month).fill(0);
  if (soft_cost_spread === 'upfront') {
    softCostSchedule[0] = soft_costs_total;
  } else {
    const spread = Math.max(pre_build_months, 1);
    const per = soft_costs_total / spread;
    for (let i = 0; i < spread; i++) softCostSchedule[i] = per;
  }

  // ── Revenue schedule ──
  const revenueSchedule = new Array(sales_settlement_month).fill(0);
  if (inputs.include_presales_staged_settlement) {
    switch (inputs.presales_schedule_method) {
      case 'staged_percent': {
        for (const row of inputs.staged_settlement_rows) {
          const mi = Math.min(Math.max(row.stage_month, 1), sales_settlement_month) - 1;
          revenueSchedule[mi] += gross_revenue * (row.stage_percent / 100);
        }
        break;
      }
      case 'unit_level': {
        for (const row of inputs.unit_staging_rows) {
          const mi = Math.min(Math.max(row.settlement_month, 1), sales_settlement_month) - 1;
          revenueSchedule[mi] += row.count * row.sale_price_each;
        }
        break;
      }
      case 'custom_cashflow': {
        for (const row of inputs.custom_revenue_rows) {
          const mi = Math.min(Math.max(row.month, 1), sales_settlement_month) - 1;
          revenueSchedule[mi] += row.amount;
        }
        break;
      }
    }
  } else {
    // Single settlement
    revenueSchedule[sales_settlement_month - 1] = gross_revenue;
  }

  // ── Month-by-month loop ──
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

  // Debt establishment fee capitalisation at specific months
  const capDebtFeeSchedule = new Array(sales_settlement_month).fill(0);
  if (inputs.include_debt_establishment_fees && inputs.debt_fee_payment_method === 'capitalised') {
    switch (inputs.debt_fee_timing) {
      case 'month_1':
        capDebtFeeSchedule[0] += land_est_fee + construction_est_fee;
        break;
      case 'construction_start':
        capDebtFeeSchedule[pre_build_months] += land_est_fee + construction_est_fee;
        break;
      case 'split':
        capDebtFeeSchedule[0] += land_est_fee;
        capDebtFeeSchedule[pre_build_months] += construction_est_fee;
        break;
    }
  }

  // Determine the last revenue month (for settlement phase labelling)
  let lastRevenueMonth = sales_settlement_month;
  for (let i = sales_settlement_month - 1; i >= 0; i--) {
    if (revenueSchedule[i] > 0) { lastRevenueMonth = i + 1; break; }
  }

  for (let m = 1; m <= sales_settlement_month; m++) {
    const idx = m - 1;
    const isLastMonth = m === sales_settlement_month;
    let phase: MonthRow['phase'] = 'pre_build';
    if (m === lastRevenueMonth || isLastMonth) phase = 'settlement';
    else if (m > pre_build_months + build_duration_months) phase = 'post_build';
    else if (m > pre_build_months) phase = 'build';

    const site_costs = m === 1 ? site_total : 0;
    const soft_costs_m = softCostSchedule[idx] ?? 0;
    const optional_costs_m = (optSchedule[idx] ?? 0) + (debtFeeSchedule[idx] ?? 0);

    let build_costs = 0;
    if (m > pre_build_months && m <= pre_build_months + build_duration_months) {
      const buildMonthIdx = m - pre_build_months - 1;
      build_costs = gross_build_cost * (progress_curve[buildMonthIdx] ?? 0);
    }

    // Selling costs: spread proportionally with revenue
    const revThisMonth = revenueSchedule[idx] ?? 0;
    const sellingCostThisMonth = gross_revenue > 0 ? selling_costs * (revThisMonth / gross_revenue) : 0;

    // Land draw at month 1
    const land_draw = m === 1 ? land_loan_amount : 0;
    land_balance += land_draw;

    // Capitalise debt fees into balances
    const capFee = capDebtFeeSchedule[idx] ?? 0;
    if (capFee > 0) {
      // Add land fee to land balance, construction fee to construction balance
      if (idx === 0) land_balance += land_est_fee;
      if (idx === pre_build_months) construction_balance += construction_est_fee;
      // Handle cases where both hit same month
      if (inputs.debt_fee_timing === 'month_1' && idx === 0) {
        construction_balance += construction_est_fee;
      }
      if (inputs.debt_fee_timing === 'construction_start' && idx === pre_build_months) {
        land_balance += land_est_fee;
      }
    }

    // Construction draw
    let construction_draw = 0;
    if (m > pre_build_months && m <= pre_build_months + build_duration_months) {
      const buildMonthIdx = m - pre_build_months - 1;
      construction_draw = gross_build_cost * (progress_curve[buildMonthIdx] ?? 0) * construction_lvr;
    }
    construction_balance += construction_draw;

    // Interest
    const land_interest = land_balance * land_r;
    const construction_interest = construction_balance * constr_r;
    const total_interest_m = land_interest + construction_interest;

    let interest_payable = 0;
    if (interest_funded) {
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

    // Equity
    const total_cost_m = site_costs + soft_costs_m + build_costs + sellingCostThisMonth + optional_costs_m;
    const total_debt_draw = land_draw + construction_draw;
    const equity_injection = Math.max(0, total_cost_m - total_debt_draw) + interest_payable +
      (m === 1 ? land_fees + construction_fees : 0);
    total_equity_required += equity_injection;

    // Revenue & debt repayment
    const revenue = revThisMonth;
    const total_debt = land_balance + construction_balance;

    // Debt repayment logic
    let debt_repayment = 0;
    if (inputs.include_presales_staged_settlement && inputs.debt_repayment_strategy === 'waterfall' && revenue > 0) {
      // Apply revenue to reduce debt
      let available = revenue;
      // Pay interest first (already handled above)
      // Pay construction debt
      const constrPay = Math.min(available, construction_balance);
      construction_balance -= constrPay;
      available -= constrPay;
      // Pay land debt
      const landPay = Math.min(available, land_balance);
      land_balance -= landPay;
      available -= landPay;
      debt_repayment = constrPay + landPay;
    } else if (isLastMonth) {
      debt_repayment = total_debt;
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
      selling_costs: sellingCostThisMonth,
      optional_costs: optional_costs_m,
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
      total_debt: land_balance + construction_balance,
    });
  }

  const total_interest = total_interest_land + total_interest_construction;
  const total_dev_cost_ex_interest = site_total + soft_costs_total + gross_build_cost + land_fees + construction_fees + selling_costs + optional_costs_total;
  const total_dev_cost_inc_interest = total_dev_cost_ex_interest + total_interest;
  const gross_profit = gross_revenue - total_dev_cost_inc_interest;
  const tax = Math.max(0, gross_profit * company_tax_rate);
  const net_profit_after_tax = gross_profit - tax;
  const equity_multiple = total_equity_required > 0 ? net_profit_after_tax / total_equity_required : 0;

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
    council_contributions,
    arch_eng_fees,
    qs_pm_fees,
    marketing_staging,
    debt_establishment_fees,
    optional_costs_total,
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
