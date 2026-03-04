import { ScenarioOutputs } from '@/lib/feasibility/types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  outputs: ScenarioOutputs;
}

const fmt = (v: number) => '$' + (v / 1000).toFixed(0) + 'k';

export function CashflowChart({ outputs }: Props) {
  const data = outputs.monthly.map(m => ({
    month: m.month,
    equity: Math.round(m.equity_injection),
    cumulative: Math.round(m.cumulative_cashflow),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Cashflow Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => '$' + v.toLocaleString()} />
            <Line type="monotone" dataKey="equity" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Monthly Equity" />
            <Line type="monotone" dataKey="cumulative" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Cumulative" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DebtChart({ outputs }: Props) {
  const data = outputs.monthly.map(m => ({
    month: m.month,
    land: Math.round(m.land_balance),
    construction: Math.round(m.construction_balance),
    total: Math.round(m.total_debt),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Debt & Drawdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => '$' + v.toLocaleString()} />
            <Legend />
            <Bar dataKey="land" stackId="a" fill="hsl(var(--primary))" name="Land" />
            <Bar dataKey="construction" stackId="a" fill="hsl(var(--accent))" name="Construction" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CostBreakdownChart({ outputs }: Props) {
  const data = [
    { name: 'Site', value: Math.round(outputs.site_total) },
    { name: 'Soft Costs', value: Math.round(outputs.soft_costs_total) },
    { name: 'Build', value: Math.round(outputs.gross_build_cost) },
    { name: 'Interest', value: Math.round(outputs.total_interest) },
    { name: 'Selling', value: Math.round(outputs.selling_costs) },
  ];

  // Add optional cost buckets if non-zero
  if (outputs.council_contributions > 0) data.push({ name: 'Council', value: Math.round(outputs.council_contributions) });
  if (outputs.arch_eng_fees > 0) data.push({ name: 'Arch/Eng', value: Math.round(outputs.arch_eng_fees) });
  if (outputs.qs_pm_fees > 0) data.push({ name: 'QS/PM', value: Math.round(outputs.qs_pm_fees) });
  if (outputs.marketing_staging > 0) data.push({ name: 'Marketing', value: Math.round(outputs.marketing_staging) });
  if (outputs.debt_establishment_fees > 0) data.push({ name: 'Debt Fees', value: Math.round(outputs.debt_establishment_fees) });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 28)}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
            <Tooltip formatter={(v: number) => '$' + v.toLocaleString()} />
            <Bar dataKey="value" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
