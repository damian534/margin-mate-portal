import { ScenarioOutputs } from '@/lib/feasibility/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  outputs: ScenarioOutputs;
}

const fmt = (v: number) => v === 0 ? '-' : '$' + Math.round(v).toLocaleString();

export function MonthlyTable({ outputs }: Props) {
  const hasOptional = outputs.optional_costs_total > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Month-by-Month</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-[1100px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] w-12">Mth</TableHead>
                  <TableHead className="text-[10px]">Phase</TableHead>
                  <TableHead className="text-[10px] text-right">Site</TableHead>
                  <TableHead className="text-[10px] text-right">Soft</TableHead>
                  <TableHead className="text-[10px] text-right">Build</TableHead>
                  {hasOptional && <TableHead className="text-[10px] text-right">Optional</TableHead>}
                  <TableHead className="text-[10px] text-right">Land Bal</TableHead>
                  <TableHead className="text-[10px] text-right">Constr Bal</TableHead>
                  <TableHead className="text-[10px] text-right">Interest</TableHead>
                  <TableHead className="text-[10px] text-right">Equity</TableHead>
                  <TableHead className="text-[10px] text-right">Revenue</TableHead>
                  <TableHead className="text-[10px] text-right">Net CF</TableHead>
                  <TableHead className="text-[10px] text-right">Total Debt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outputs.monthly.map(m => (
                  <TableRow key={m.month} className={m.phase === 'settlement' ? 'bg-muted/50 font-medium' : ''}>
                    <TableCell className="text-[10px]">{m.month}</TableCell>
                    <TableCell className="text-[10px] capitalize">{m.phase.replace('_', ' ')}</TableCell>
                    <TableCell className="text-[10px] text-right">{fmt(m.site_costs)}</TableCell>
                    <TableCell className="text-[10px] text-right">{fmt(m.soft_costs)}</TableCell>
                    <TableCell className="text-[10px] text-right">{fmt(m.build_costs)}</TableCell>
                    {hasOptional && <TableCell className="text-[10px] text-right">{fmt(m.optional_costs)}</TableCell>}
                    <TableCell className="text-[10px] text-right">{fmt(m.land_balance)}</TableCell>
                    <TableCell className="text-[10px] text-right">{fmt(m.construction_balance)}</TableCell>
                    <TableCell className="text-[10px] text-right">{fmt(m.total_interest)}</TableCell>
                    <TableCell className="text-[10px] text-right">{fmt(m.equity_injection)}</TableCell>
                    <TableCell className="text-[10px] text-right">{fmt(m.revenue)}</TableCell>
                    <TableCell className="text-[10px] text-right">{fmt(m.net_cashflow)}</TableCell>
                    <TableCell className="text-[10px] text-right">{fmt(m.total_debt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
