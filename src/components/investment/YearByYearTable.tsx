import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarRange } from "lucide-react";
import { EngineResults, formatCurrency } from "@/lib/investment/engine";
import { cn } from "@/lib/utils";

const HEADERS = [
  "Year", "Property Value", "Loan Balance", "Gross Equity", "Rental Income", "Operating Exp.",
  "Interest", "Principal", "Taxable P/L", "Loss Opening", "Loss Used", "Loss Added",
  "Loss Closing", "Tax Benefit", "Cashflow (pre-tax)", "Cashflow (after tax)",
  "Cumulative Cash In", "Net Equity",
];

export function YearByYearTable({ results }: { results: EngineResults }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-primary" /> Year-by-Year Detail
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {HEADERS.map(h => (
                  <TableHead key={h} className={cn("whitespace-nowrap text-xs", h !== "Year" && "text-right")}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.years.map(y => (
                <TableRow key={y.year}>
                  <TableCell className="font-medium">{y.year}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(y.closingPropertyValue)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(y.closingLoanBalance)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(y.grossEquity)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(y.effectiveRentalIncome)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(y.operatingExpenses)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(y.interestPaid)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(y.principalRepaid)}</TableCell>
                  <TableCell className={cn("text-right whitespace-nowrap", y.taxableResult < 0 && "text-destructive")}>{formatCurrency(y.taxableResult)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(y.lossOpening)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(y.lossUsed)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(y.lossAdded)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap font-medium">{formatCurrency(y.lossClosing)}</TableCell>
                  <TableCell className={cn("text-right whitespace-nowrap", y.taxBenefit > 0 && "text-primary")}>{formatCurrency(y.taxBenefit)}</TableCell>
                  <TableCell className={cn("text-right whitespace-nowrap", y.cashflowBeforeTax < 0 && "text-destructive")}>{formatCurrency(y.cashflowBeforeTax)}</TableCell>
                  <TableCell className={cn("text-right whitespace-nowrap", y.cashflowAfterTax < 0 ? "text-destructive" : "text-primary")}>{formatCurrency(y.cashflowAfterTax)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(y.cumulativeInvestorCash)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap font-medium text-primary">{formatCurrency(y.grossEquity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Principal repayments are cash you contribute, not an expense — the benefit comes back to you as a reduced loan balance at sale, so they are never double counted.
        </p>
      </CardContent>
    </Card>
  );
}
