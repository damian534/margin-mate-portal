import {
  TrendingUp,
  Calculator,
  Landmark,
  Briefcase,
  Building2,
  PiggyBank,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  path: string;
  brokerOnly?: boolean;
}

export const TOOLS: ToolDefinition[] = [
  { id: 'funds-position', name: 'Funds Position', description: 'Solve property value, LVR, loan, LMI, government charges and funds to complete — toggle any figure to fix or auto-calculate it.', icon: Wallet, path: '/tools/funds-position', brokerOnly: true },
  { id: 'sell-upgrade-simulator', name: 'Sell & Upgrade Timeline Simulator', description: 'Model what happens if a vendor sells now vs waits. Includes equity, costs, growth and upgrade gap.', icon: TrendingUp, path: '/tools/sell-upgrade-simulator' },
  { id: 'loan-repayment', name: 'Loan Repayment Calculator', description: 'Enter loan amount, rate and term — see monthly, fortnightly and weekly repayments plus total interest.', icon: Calculator, path: '/tools/loan-repayment' },
  { id: 'stamp-duty', name: 'Stamp Duty Calculator', description: 'Estimate stamp duty across all Australian states with first home buyer concessions.', icon: Landmark, path: '/tools/stamp-duty' },
  { id: 'negative-gearing', name: 'Investment Property Calculator', description: 'Negative gearing tax benefits, cashflow analysis, depreciation, and long-term equity projections.', icon: TrendingUp, path: '/tools/negative-gearing', brokerOnly: true },
  { id: 'portfolio-advisor', name: 'Portfolio Advisor', description: 'Multi-property portfolio analysis with CGT, hold vs sell scenarios, and combined projections.', icon: Briefcase, path: '/tools/portfolio-advisor', brokerOnly: true },
  { id: 'feasibility', name: 'Development Feasibility', description: 'Model land + build + finance with multi-scenario comparison, partner equity splits, and sensitivity analysis.', icon: Building2, path: '/tools/feasibility', brokerOnly: true },
  { id: 'retirement', name: 'Retirement Reverse Engineer', description: 'Work backwards from a passive income goal to required assets, property count, loan assumptions and purchase schedule.', icon: PiggyBank, path: '/tools/retirement', brokerOnly: true },
];
