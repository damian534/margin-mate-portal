import { Scenario, ScenarioOutputs } from '@/lib/feasibility/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props {
  scenarios: Scenario[];
}

const fmt = (v: number) => '$' + Math.round(v).toLocaleString();

export function ScenarioComparison({ scenarios }: Props) {
  const withOutputs = scenarios.filter(s => s.outputs);
  if (withOutputs.length < 2) return null;

  const metrics: { label: string; key: keyof ScenarioOutputs }[] = [
    { label: 'Gross Revenue', key: 'gross_revenue' },
    { label: 'Dev Cost (inc interest)', key: 'total_dev_cost_inc_interest' },
    { label: 'Total Interest', key: 'total_interest' },
    { label: 'Optional Costs', key: 'optional_costs_total' },
    { label: 'Net Profit', key: 'net_profit_after_tax' },
    { label: 'Total Equity', key: 'total_equity_required' },
    { label: 'Peak Debt', key: 'peak_debt' },
    { label: 'Equity Multiple', key: 'equity_multiple' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Scenario Comparison</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Metric</TableHead>
              {withOutputs.map(s => (
                <TableHead key={s.id} className="text-xs text-right">{s.inputs.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map(m => (
              <TableRow key={m.label}>
                <TableCell className="text-xs">{m.label}</TableCell>
                {withOutputs.map(s => {
                  const v = s.outputs![m.key] as number;
                  return (
                    <TableCell key={s.id} className="text-xs text-right">
                      {m.key === 'equity_multiple' ? v.toFixed(2) + 'x' : fmt(v)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
