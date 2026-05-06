import { supabase } from '@/integrations/supabase/client';

export interface FactFindAggregates {
  hasData: boolean;
  totalIncome: number;       // gross annual, both applicants
  totalAssets: number;       // properties + savings + super + vehicles + other
  totalLiabilities: number;  // home + IP loans + cards + personal + other + HECS + tax + BNPL + vehicle finance
  monthlyExpenses: number;
  netPosition: number;       // assets - liabilities
}

const num = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isFinite(n) ? n : 0;
};

const sumRepeatable = (arr: any, key: string) => {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((s, item) => s + num(item?.[key]), 0);
};

/** Compute totals from a sectionKey -> data map (as stored in fact_find_responses). */
export function computeFactFindAggregates(
  sections: Record<string, Record<string, any>>
): FactFindAggregates {
  const sectionKeys = Object.keys(sections || {});
  if (sectionKeys.length === 0) {
    return { hasData: false, totalIncome: 0, totalAssets: 0, totalLiabilities: 0, monthlyExpenses: 0, netPosition: 0 };
  }

  // ── Income (annual) ── primary + second applicant
  const incomeFromApplicant = (s: Record<string, any> = {}) => {
    const monthlyRental = num(s.rental_income); // stored as monthly per the wizard
    return (
      num(s.base_salary) +
      num(s.overtime) +
      num(s.bonuses) +
      num(s.commission) +
      num(s.allowances) +
      monthlyRental * 12 +
      num(s.government_benefits) +
      num(s.child_support_income) +
      num(s.investment_income) +
      num(s.other_income) +
      num(s.business_net_profit) +
      num(s.directors_salary)
    );
  };
  const totalIncome =
    incomeFromApplicant(sections.mff_primary_employment) +
    incomeFromApplicant(sections.mff_second_employment);

  // ── Assets ──
  const home = sections.mff_re_home || {};
  let totalAssets = num(home.home_value);

  // Investment properties (1..9)
  for (let i = 1; i <= 9; i++) {
    const ip = sections[`mff_ip_${i}`];
    if (ip) totalAssets += num(ip.estimated_value);
  }
  // Vehicles (1..3)
  for (let i = 1; i <= 3; i++) {
    const v = sections[`mff_vehicle_${i}`];
    if (v && v.has_vehicle === 'yes') totalAssets += num(v.value);
  }
  // Savings (1..6)
  for (let i = 1; i <= 6; i++) {
    const a = sections[`mff_savings_${i}`];
    if (a && a.has_account === 'yes') totalAssets += num(a.balance);
  }
  // Other assets
  const other = sections.mff_other_assets || {};
  totalAssets +=
    num(other.home_contents) +
    num(other.superannuation) +
    num(other.shares_investments) +
    num(other.crypto) +
    num(other.other_assets_value);

  // ── Liabilities ──
  let totalLiabilities = num(home.home_loan_balance);
  for (let i = 1; i <= 9; i++) {
    const ip = sections[`mff_ip_${i}`];
    if (ip) totalLiabilities += num(ip.loan_balance);
  }
  for (let i = 1; i <= 3; i++) {
    const v = sections[`mff_vehicle_${i}`];
    if (v && v.has_vehicle === 'yes' && v.owned_financed && v.owned_financed !== 'owned') {
      totalLiabilities += num(v.finance_balance);
    }
  }
  const liabPersonal = sections.mff_liab_personal || {};
  totalLiabilities += sumRepeatable(liabPersonal.personal_loans, 'balance');
  const liabCards = sections.mff_liab_cards || {};
  totalLiabilities += sumRepeatable(liabCards.credit_cards, 'balance');
  const liabOther = sections.mff_liab_other || {};
  totalLiabilities += sumRepeatable(liabOther.other_loans, 'balance');
  totalLiabilities += sumRepeatable(liabOther.bnpl_accounts, 'balance');
  const liabHecs = sections.mff_liab_hecs || {};
  if (liabHecs.has_hecs === 'yes') totalLiabilities += num(liabHecs.hecs_balance);
  if (liabHecs.has_hecs_2 === 'yes') totalLiabilities += num(liabHecs.hecs_balance_2);
  if (liabHecs.has_tax_debt === 'yes') totalLiabilities += num(liabHecs.tax_debt_amount);

  // ── Monthly expenses ──
  const exLiving = sections.mff_expenses_living || {};
  const exDisc = sections.mff_expenses_discretionary || {};
  const monthlyExpenses = Object.values(exLiving).reduce<number>((s, v) => s + num(v), 0)
    + Object.values(exDisc).reduce<number>((s, v) => s + num(v), 0);

  return {
    hasData: true,
    totalIncome,
    totalAssets,
    totalLiabilities,
    monthlyExpenses,
    netPosition: totalAssets - totalLiabilities,
  };
}

export async function fetchFactFindAggregates(leadId: string): Promise<FactFindAggregates> {
  const { data, error } = await supabase
    .from('fact_find_responses')
    .select('section, data')
    .eq('lead_id', leadId);
  if (error || !data || data.length === 0) {
    return { hasData: false, totalIncome: 0, totalAssets: 0, totalLiabilities: 0, monthlyExpenses: 0, netPosition: 0 };
  }
  const sections: Record<string, Record<string, any>> = {};
  for (const row of data as any[]) {
    sections[row.section] = (row.data as any) || {};
  }
  return computeFactFindAggregates(sections);
}

export const fmtCurrency = (n: number, opts: { compact?: boolean } = {}) => {
  if (!isFinite(n)) return '$0';
  if (opts.compact && Math.abs(n) >= 1000) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    return `$${Math.round(n / 1000)}k`;
  }
  return `$${Math.round(n).toLocaleString()}`;
};
