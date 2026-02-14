import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, BarChart3, Home, Building2, Landmark, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KPIProps {
  kpis: {
    totalSettledVolume: number;
    totalPendingVolume: number;
    settledCount: number;
    avgLoanSize: number;
    totalDeals: number;
    purchasePct: number;
    refinancePct: number;
    topLender: string;
    topSource: string;
    momGrowth: number;
  };
}

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function SettlementKPIs({ kpis }: KPIProps) {
  const cards = [
    { label: 'Settled Volume', value: formatCurrency(kpis.totalSettledVolume), icon: DollarSign, sub: `${kpis.settledCount} deals` },
    { label: 'Pending Volume', value: formatCurrency(kpis.totalPendingVolume), icon: TrendingUp, sub: `${kpis.totalDeals} total` },
    { label: 'Avg Loan Size', value: formatCurrency(kpis.avgLoanSize), icon: BarChart3, sub: `${kpis.purchasePct}% Purchase / ${kpis.refinancePct}% Refi` },
    { label: 'MoM Growth', value: `${kpis.momGrowth >= 0 ? '+' : ''}${kpis.momGrowth.toFixed(1)}%`, icon: kpis.momGrowth >= 0 ? ArrowUpRight : ArrowDownRight, sub: 'vs last month', positive: kpis.momGrowth >= 0 },
    { label: 'Top Lender', value: kpis.topLender, icon: Landmark, sub: '' },
    { label: 'Top Source', value: kpis.topSource, icon: Home, sub: '' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="border-border/50">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <c.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
            </div>
            <p className={`text-lg font-bold font-heading truncate ${'positive' in c ? (c.positive ? 'text-emerald-600' : 'text-red-500') : ''}`}>
              {c.value}
            </p>
            {c.sub && <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
