import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/advisor/calculations";

export interface AdvisorYearlyProjection {
  year: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  cumulativeHoldingCost: number;
  netWealth: number;
}

interface AdvisorProjectionTableProps {
  projections: AdvisorYearlyProjection[];
}

export function AdvisorProjectionTable({ projections }: AdvisorProjectionTableProps) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" />
          Year-by-Year Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-muted-foreground font-medium">Year</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Property Value</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Loan Balance</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Equity</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Out-of-Pocket</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Net Wealth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projections.map((projection) => (
                <TableRow key={projection.year} className="border-border/50">
                  <TableCell className="font-medium text-foreground">{projection.year}</TableCell>
                  <TableCell className="text-right text-foreground">
                    {formatCurrency(projection.propertyValue)}
                  </TableCell>
                  <TableCell className="text-right text-foreground">
                    {formatCurrency(projection.loanBalance)}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${projection.equity >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(projection.equity)}
                  </TableCell>
                  <TableCell className="text-right text-destructive">
                    {formatCurrency(projection.cumulativeHoldingCost)}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${projection.netWealth >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {projection.netWealth >= 0 ? formatCurrency(projection.netWealth) : `-${formatCurrency(Math.abs(projection.netWealth))}`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}