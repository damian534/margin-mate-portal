import { ScenarioOutputs } from '@/lib/feasibility/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  outputs: ScenarioOutputs;
}

const fmt = (v: number) => '$' + Math.round(v).toLocaleString();

export function PartnerSummary({ outputs }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Partner Summary</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Partner</TableHead>
              <TableHead className="text-xs text-right">Ownership</TableHead>
              <TableHead className="text-xs text-right">Equity</TableHead>
              <TableHead className="text-xs text-right">Profit</TableHead>
              <TableHead className="text-xs text-right">ROE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {outputs.partner_results.map((p, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs">{p.name}</TableCell>
                <TableCell className="text-xs text-right">{p.ownership_percent}%</TableCell>
                <TableCell className="text-xs text-right">{fmt(p.equity_contribution)}</TableCell>
                <TableCell className="text-xs text-right">{fmt(p.profit_distribution)}</TableCell>
                <TableCell className="text-xs text-right">{(p.return_on_equity * 100).toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
