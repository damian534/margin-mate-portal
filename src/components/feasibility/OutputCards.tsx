import { ScenarioOutputs } from '@/lib/feasibility/types';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  outputs: ScenarioOutputs;
}

const fmt = (v: number) => '$' + Math.round(v).toLocaleString();
const fmtPct = (v: number) => (v * 100).toFixed(1) + '%';

export function OutputCards({ outputs }: Props) {
  const cards = [
    { label: 'Total Revenue', value: fmt(outputs.gross_revenue), color: 'text-green-600' },
    { label: 'Dev Cost (ex interest)', value: fmt(outputs.total_dev_cost_ex_interest) },
    { label: 'Interest (Land)', value: fmt(outputs.total_interest_land) },
    { label: 'Interest (Construction)', value: fmt(outputs.total_interest_construction) },
    { label: 'Total Interest', value: fmt(outputs.total_interest) },
    { label: 'Dev Cost (inc interest)', value: fmt(outputs.total_dev_cost_inc_interest) },
    { label: 'Gross Profit', value: fmt(outputs.gross_profit), color: outputs.gross_profit >= 0 ? 'text-green-600' : 'text-destructive' },
    { label: 'Tax', value: fmt(outputs.tax) },
    { label: 'Net Profit', value: fmt(outputs.net_profit_after_tax), color: outputs.net_profit_after_tax >= 0 ? 'text-green-600' : 'text-destructive' },
    { label: 'Total Equity Required', value: fmt(outputs.total_equity_required) },
    { label: 'Peak Debt', value: fmt(outputs.peak_debt) },
    { label: 'Peak Monthly Cashflow', value: fmt(outputs.peak_monthly_cashflow) },
    { label: 'Equity Multiple', value: outputs.equity_multiple.toFixed(2) + 'x' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {cards.map(c => (
        <Card key={c.label}>
          <CardContent className="p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.label}</div>
            <div className={`text-lg font-bold ${c.color ?? ''}`}>{c.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PerUnitCards({ outputs }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: 'Cost / Unit', value: fmt(outputs.cost_per_unit) },
        { label: 'Revenue / Unit', value: fmt(outputs.revenue_per_unit) },
        { label: 'Profit / Unit', value: fmt(outputs.profit_per_unit) },
      ].map(c => (
        <Card key={c.label}>
          <CardContent className="p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.label}</div>
            <div className="text-base font-semibold">{c.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
